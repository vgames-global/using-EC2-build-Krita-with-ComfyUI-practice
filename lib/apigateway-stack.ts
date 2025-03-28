import {
    NestedStack,
    aws_apigateway as _apigateway,
    Duration, NestedStackProps
} from "aws-cdk-lib";
import { Constants } from "./constants";
import {Construct} from "constructs";
import * as cdk from "aws-cdk-lib";
import * as lambda from "aws-cdk-lib/aws-lambda";

export interface APIGatewayProps extends NestedStackProps {
    comfyuiServersPostFunc: lambda.IFunction,
    comfyuiServersStopFunc: lambda.IFunction,
    comfyuiServersGetFunc: lambda.IFunction,
    comfyuiCustomNodesFunc: lambda.IFunction;
    comfyuiServersTerminateFunc: lambda.IFunction;
}

export class ApigatewayStack extends NestedStack {

    public readonly comfyUIServersAPI: _apigateway.RestApi;

    constructor(scope: Construct, id: string, props: APIGatewayProps) {
        super(scope, id, props);

        const stageName = 'prod';
        this.comfyUIServersAPI = new _apigateway.RestApi(this, 'COMFYUI-SERVERS-API', {
            restApiName: 'COMFYUI-SERVERS-API',
            retainDeployments: false,
            deploy: true,
            deployOptions: {
                stageName: stageName,
                cacheClusterEnabled: true,
                cacheClusterSize: '0.5',
                cacheTtl: Duration.minutes(1),
                throttlingBurstLimit: 100,
                throttlingRateLimit: 1000
            },
            endpointTypes: [
                _apigateway.EndpointType.EDGE
            ],
            defaultCorsPreflightOptions: {
                allowOrigins: ['*'], // 允许所有来源
                allowMethods: ['OPTIONS', 'GET', 'POST', 'PUT', 'DELETE'], // 允许的HTTP方法
                allowHeaders: ['Content-Type', 'Authorization'] // 允许的请求头
            }
        });

        const apiKey = new _apigateway.ApiKey(this, 'COMFYUI-SERVERS-API-KEY', {
            apiKeyName: 'COMFYUI-SERVERS-API-KEY',
            enabled: true,
            description: 'COMFYUI-SERVERS-API-KEY'
        });

        const usagePlan = this.comfyUIServersAPI.addUsagePlan('ComfyUI-API-Key-UsagePlan', {
            name: 'ComfyUI-API-Key-UsagePlan',
            throttle: {
                burstLimit: 10,
                rateLimit: 100
            },
            quota: {
                limit: 1000,
                offset: 0,
                period: _apigateway.Period.DAY
            },
            apiStages: [
                {
                    api: this.comfyUIServersAPI,
                    stage: this.comfyUIServersAPI.deploymentStage,
                }
            ]
        });
        usagePlan.addApiKey(apiKey)

        const comfyuiServersRootPath = this.comfyUIServersAPI.root.addResource('comfyui-servers', {
            defaultMethodOptions: {
                apiKeyRequired: true
            }
        });

        comfyuiServersRootPath.addMethod('POST', new _apigateway.LambdaIntegration(props.comfyuiServersPostFunc));

        comfyuiServersRootPath.addMethod('GET', new _apigateway.LambdaIntegration(props.comfyuiServersGetFunc),
        {
            requestParameters: {
              'method.request.querystring.username': true,
            },
        });

        const comfyUIServersStopPath = comfyuiServersRootPath.addResource('stop', {
            defaultMethodOptions: {
                apiKeyRequired: true
            }
        });


        comfyUIServersStopPath.addMethod('PATCH', new _apigateway.LambdaIntegration(props.comfyuiServersStopFunc));


        //dyx*
        const comfyUIServersTerminatePath = comfyuiServersRootPath.addResource('terminate', {
            defaultMethodOptions: {
            apiKeyRequired: true
            }
        });


        comfyUIServersTerminatePath.addMethod('PATCH', new _apigateway.LambdaIntegration(props.comfyuiServersTerminateFunc));

       
        //*dyx
        
        const comfyUICustomNodesPath = comfyuiServersRootPath.addResource('custom-nodes', {
            defaultMethodOptions: {
                apiKeyRequired: true
            }
        });


        
        comfyUICustomNodesPath.addMethod('ANY', new _apigateway.LambdaIntegration(props.comfyuiCustomNodesFunc))
        
        const singleComfyUICustomNodesPath = comfyUICustomNodesPath.addResource('{id}', {
            defaultMethodOptions: {
                apiKeyRequired: true
            }
        });
        singleComfyUICustomNodesPath.addMethod('ANY', new _apigateway.LambdaIntegration(props.comfyuiCustomNodesFunc),{
            requestParameters: {
                'method.request.path.id': true
            }
        })
        
        cdk.Tags.of(this.comfyUIServersAPI).add('RESOURCE_TAG', Constants.RESOURCE_TAG);
        new cdk.CfnOutput(scope, 'API-Key ARN', { value: apiKey.keyArn })
        new cdk.CfnOutput(scope, 'InvokeUrl', { value: this.comfyUIServersAPI.url })
    }
}