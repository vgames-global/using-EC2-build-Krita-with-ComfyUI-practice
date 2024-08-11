import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import {VPCStack} from "./vpc-stack"
import { DynamodbStack } from './dynamodb-stack';
import { LambdaStack } from './lambda-stack';
import {ApigatewayStack} from "./apigateway-stack";
import { EFSStack } from './efs-stack';

export class ComfyuiOnAwsEc2Stack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);
    const vpcStack = new VPCStack(this, "comfyui-vpc");

    const user_comfyui_servers_table = new DynamodbStack(this, "user_comfyui_servers_table");

    const efsStack = new EFSStack(this, "comfyui_efs_stack", {vpc: vpcStack.vpc})
    
    const lambdas = new LambdaStack(this, "comfyui_lambda_stack", {
      comfyUISecurityGroup: vpcStack.comfyUISecurityGroup,
      vpcId: vpcStack.vpc.vpcId,
      pubSubnetID: vpcStack.pubSubnetID,
      comfyuiInstanceProfile: vpcStack.comfyuiInstanceProfile,
      accessPointGlobalId: efsStack.accessPointGlobalId,
      accessPointGroupsId: efsStack.accessPointGroupsId,
      fileSystemId: efsStack.fileSystemId,
    });
    
    const apiGatewayStack = new ApigatewayStack(this, 'apigateway-stack', {
      comfyuiServersPostFunc: lambdas.comfyuiServersPostFunc,
      comfyuiServersStopFunc: lambdas.comfyuiServersStopFunc,
      comfyuiServersGetFunc: lambdas.comfyuiServersGetFunc,
    });
    
    new cdk.CfnOutput(this, 'ComfyUI-VPC-ID', {
      value: vpcStack.vpc.vpcId,
      exportName: `${id}-VPC-ID`,
    });
  }
}
