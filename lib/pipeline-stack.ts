import * as cdk from '@aws-cdk/core';
import {Artifact, Pipeline} from "@aws-cdk/aws-codepipeline";
import {Effect, PolicyStatement} from "@aws-cdk/aws-iam";
import {ComputeType, BuildSpec, LinuxBuildImage, PipelineProject} from "@aws-cdk/aws-codebuild";
import {Repository} from "@aws-cdk/aws-codecommit";
import {CodeBuildAction, CodeCommitSourceAction, ManualApprovalAction} from "@aws-cdk/aws-codepipeline-actions";

export class PipelineStack extends cdk.Stack {

    constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);
        const PROJECT_NAME: string = 'serverless-cicd-demo';
        const repository = Repository.fromRepositoryName(this, PROJECT_NAME, 'circle-area-calculator');

        const sourceArtifact = new Artifact(PROJECT_NAME + '-artifact');
        const buildAndTestStageArtifact = new Artifact(PROJECT_NAME + 'build-test-stage-artifact');

        const BRANCH_NAME = 'master';

        const checkoutSourceCodeAction = new CodeCommitSourceAction({
            actionName: 'checkoutSourceCode',
            output: sourceArtifact,
            repository: repository,
            branch: BRANCH_NAME,
        });

        const buildAndTestStageCodeBuildProject = new PipelineProject(this, PROJECT_NAME + '-build-test', {
            environment: {
                buildImage: LinuxBuildImage.AMAZON_LINUX_2,
                computeType: ComputeType.SMALL
            },
        });

        const s3FullAccessPolicy = new PolicyStatement(
            {
                resources: [
                    "*"
                ],
                actions: [
                    "s3:*"
                ],
                effect: Effect.ALLOW
            }
        );

        buildAndTestStageCodeBuildProject.addToRolePolicy(s3FullAccessPolicy);

        const deployRolePolicyStatement = new PolicyStatement(
            {
                resources: [
                    "*"
                ],
                actions: [
                    "apigateway:*",
                    "s3:*",
                    "lambda:*",
                    "cloudformation:*",
                    "iam:*"
                ],
                effect: Effect.ALLOW
            }
        )

        const deployStageCodeBuildProject = new PipelineProject(this, PROJECT_NAME + '-deploy', {
            environment: {
                buildImage: LinuxBuildImage.AMAZON_LINUX_2,
                computeType: ComputeType.SMALL
            },
            buildSpec: BuildSpec.fromSourceFilename("buildspec_deploy.yml")
        });

        deployStageCodeBuildProject.addToRolePolicy(deployRolePolicyStatement);

        const buildAndTestAction = new CodeBuildAction({
            actionName: 'build_test',
            project: buildAndTestStageCodeBuildProject,
            input: sourceArtifact,
            outputs: [buildAndTestStageArtifact]
        });

        const manualApprovalAction = new ManualApprovalAction({
                actionName: 'ApproveChanges',
                runOrder: 1,
            }
        );

        const deployAction = new CodeBuildAction({
            actionName: 'deploy',
            project: deployStageCodeBuildProject,
            input: buildAndTestStageArtifact,
            runOrder: 2
        });

        const cicdPipeline = new Pipeline(this, 'circle-area-calculator-pipeline', {
            pipelineName: 'circle-area-calculator-pipeline',
            stages: [
                {
                    stageName: 'Source',
                    actions: [checkoutSourceCodeAction],
                },
                {
                    stageName: 'Build-Test',
                    actions: [buildAndTestAction]
                },
                {
                    stageName: 'Deploy',
                    actions: [manualApprovalAction, deployAction]
                }
            ]
        });

        cicdPipeline.addToRolePolicy(s3FullAccessPolicy)
    }
}
