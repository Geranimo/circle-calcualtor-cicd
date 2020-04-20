#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from '@aws-cdk/core';
import {PipelineStack} from '../lib/pipeline-stack';

const app = new cdk.App();
new PipelineStack(app, 'cicd-servereless-demo-stack', {
    env: {
        region: 'eu-central-1',
    },
    stackName: 'cicd-servereless-demo-stack',
    description: 'ci/cd pipeline to build, test and deploy lambdas',
});
app.synth();