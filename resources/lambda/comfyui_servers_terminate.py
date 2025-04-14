import boto3
import json
import os
from comfyui_servers_dbutils import update_status, query_comfyui_servers_by_username, delete_comfyui_servers_info

comfyui_servers_table = os.environ.get('USER_COMFYUI_SERVERS_TABLE')
dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table(comfyui_servers_table)
ec2_client = boto3.client('ec2')

def lambda_handler(event, context):

    print(event)
    body = json.loads(event['body'])
    username = body.get('username','No body')
    group_name = body.get('group_name','No Group')
    result = query_comfyui_servers_by_username(username)
    
    if result:
        for item in result:
            terminate_instance(item['instance_id'],username)
            return {
                "statusCode": 200,
                "body": json.dumps({"instance_id": item['instance_id'], "code": 200})
            }
    else:
        return {
            "statusCode": 400,
            "body": json.dumps({"message": f"No instance exists with username: {username}", "code": 400})
        }

def terminate_instance(instance_id, username):
    """
    Terminates an EC2 instance and removes its record from DynamoDB.
    
    Args:
        instance_id (str): The ID of the EC2 instance to terminate
        username (str): The username associated with the instance
        
    Returns:
        dict: Dictionary containing both termination and deletion responses
        
    Raises:
        Exception: If either operation fails
    """
    result = {
        'termination_response': None,
        'deletion_response': None
    }
    
    try:
        # Terminate the EC2 instance
        termination_response = ec2_client.terminate_instances(
            InstanceIds=[instance_id]
        )
        result['termination_response'] = termination_response
        print(f'Successfully initiated termination for instance: {instance_id}')
        
        # Wait for termination to complete (optional)
        # waiter = ec2_client.get_waiter('instance_terminated')
        # waiter.wait(InstanceIds=[instance_id])
        # print(f'Instance {instance_id} fully terminated')
        
    except Exception as e:
        print(f'Error terminating instance {instance_id}: {e}')
        raise e
    
    try:
        # Delete the DynamoDB record
        deletion_response = delete_comfyui_servers_info(username, instance_id)
        
        result['deletion_response'] = deletion_response
        
        if deletion_response and 'Attributes' in deletion_response:
            print(f"Deleted record for user: {username}")
        else:
            print(f"No record found for user: {username}")
            
    except Exception as e:
        print(f'Error deleting record for user {username}: {e}')
        raise e
    
    return result