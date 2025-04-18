from datetime import datetime
import os
import boto3
import json
import uuid
from boto3.dynamodb.conditions import Key
from botocore.exceptions import ClientError

comfyui_servers_table = os.environ.get('USER_COMFYUI_SERVERS_TABLE')
comfyui_server_port = os.environ.get('COMFYUI_SERVER_PORT')
dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table(comfyui_servers_table)

def update_status(username, instance_id, status):
    now = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    try:
        response = table.update_item(
            Key={
                'username': username,  # 分区键
                'instance_id': instance_id  # 排序键
            },
            UpdateExpression="SET #status = :status, #updated_at = :updated_at",  # 更新表达式
            ExpressionAttributeNames={
                '#status': 'status',  # 使用表达式属性名称来避免与保留字冲突
                '#updated_at': 'updated_at'
            },
            ExpressionAttributeValues={
                ':status': status,  # 新的状态值
                ':updated_at': now  # 当前时间
            },
            ReturnValues="UPDATED_NEW"  # 返回更新后的新值
        )
        print("UpdateItem succeeded:", response)
    except Exception as e:
        print(f"Error updating item: {e}")

def query_comfyui_servers_by_username(username):
    try:
        response = table.query(
            KeyConditionExpression=Key('username').eq(username)  # 这里 'username' 是你的分区键名
        )
        items = response['Items']
        return items
    except Exception as e:
        print(f"Error querying items: {e}")
        return None

def create_comfyui_servers_info(username, group_name, instance_id):
    try:
        now = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
        
        item = {
                'username': username,
                'group_name': group_name,
                'instance_id': instance_id,
                'status': 'creating',
                'port': comfyui_server_port,
                'created_at': now,
                'updated_at': now,
        }
        table.put_item(Item=item)
    except Exception as e:
        print(f'Error stopping instance: {e}')
        raise e
    
def delete_comfyui_servers_info(username, instance_id):
    response = None # Initialize response
    try:
        response = table.delete_item(
            Key={
                'username': username,
                'instance_id': instance_id
            },
            ConditionExpression='attribute_exists(username)'
        )
        return response
    except ClientError as e:
        # Check if the error is a ConditionalCheckFailedException
        if e.response['Error']['Code'] == 'ConditionalCheckFailedException':
            print(f"No record found for user: {username}")
            return None
        else:
            print(f"ClientError deleting item: {e}")
            return None
    except table.meta.client.exceptions.ConditionalCheckFailedException:
        print(f"No record found for user: {username}")
        return None
    except Exception as e:
        print(f"Error deleting item: {e}")
        raise e



def update_comfyui_server_info(username, instance_id, status, server_info, private_ip):
    now = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    try:
        response = table.update_item(
            Key={
                'username': username,  # 分区键
                'instance_id': instance_id  # 排序键
            },
            UpdateExpression="SET #status = :status,#server_info = :server_info, #updated_at = :updated_at, #private_ip = :private_ip",  # 更新表达式
            ExpressionAttributeNames={
                '#status': 'status',  # 使用表达式属性名称来避免与保留字冲突
                '#updated_at': 'updated_at',
                '#server_info': 'server_info',
                '#private_ip': 'private_ip',
            },
            ExpressionAttributeValues={
                ':status': status,  # 新的状态值
                ':updated_at': now,  # 当前时间
                ':server_info': server_info,
                ':private_ip': private_ip
            },
            ReturnValues="UPDATED_NEW"  # 返回更新后的新值
        )
        print("UpdateItem succeeded:", response)
    except Exception as e:
        print(f"Error updating item: {e}")