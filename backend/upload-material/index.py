import json
import os
import base64
from typing import Dict, Any
import psycopg2
from psycopg2.extras import RealDictCursor

def extract_text_from_txt(content: bytes) -> str:
    '''Extract text from TXT file'''
    return content.decode('utf-8', errors='ignore')

def extract_text_from_pdf(content: bytes) -> str:
    '''Extract text from PDF file using PyPDF2'''
    try:
        import io
        from PyPDF2 import PdfReader
        
        pdf_file = io.BytesIO(content)
        reader = PdfReader(pdf_file)
        
        text = ""
        for page in reader.pages:
            text += page.extract_text() + "\n"
        
        return text.strip()
    except Exception as e:
        raise Exception(f"PDF extraction error: {str(e)}")

def extract_text_from_docx(content: bytes) -> str:
    '''Extract text from DOCX file using python-docx'''
    try:
        import io
        from docx import Document
        
        docx_file = io.BytesIO(content)
        doc = Document(docx_file)
        
        text = ""
        for paragraph in doc.paragraphs:
            text += paragraph.text + "\n"
        
        return text.strip()
    except Exception as e:
        raise Exception(f"DOCX extraction error: {str(e)}")

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    Business: Upload and extract text from PDF, DOCX, TXT files and store in database
    Args: event with httpMethod, body containing fileName, fileContent (base64), fileType
          context with request_id attribute
    Returns: HTTP response with material_id and extracted text preview
    '''
    method: str = event.get('httpMethod', 'GET')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, X-User-Id',
                'Access-Control-Max-Age': '86400'
            },
            'body': '',
            'isBase64Encoded': False
        }
    
    if method == 'GET':
        database_url = os.environ.get('DATABASE_URL')
        if not database_url:
            return {
                'statusCode': 500,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({'error': 'Database not configured'}),
                'isBase64Encoded': False
            }
        
        conn = psycopg2.connect(database_url)
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        cursor.execute("""
            SELECT id, name, file_type, upload_date, questions_generated,
                   LEFT(content, 200) as content_preview
            FROM materials
            ORDER BY upload_date DESC
        """)
        
        materials = cursor.fetchall()
        cursor.close()
        conn.close()
        
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({
                'materials': [dict(m) for m in materials]
            }, default=str),
            'isBase64Encoded': False
        }
    
    if method != 'POST':
        return {
            'statusCode': 405,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({'error': 'Method not allowed'}),
            'isBase64Encoded': False
        }
    
    body_data = json.loads(event.get('body', '{}'))
    file_name: str = body_data.get('fileName', '')
    file_content_b64: str = body_data.get('fileContent', '')
    file_type: str = body_data.get('fileType', '')
    
    if not file_name or not file_content_b64:
        return {
            'statusCode': 400,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({'error': 'fileName and fileContent are required'}),
            'isBase64Encoded': False
        }
    
    try:
        file_content = base64.b64decode(file_content_b64)
        
        if file_type.lower() in ['txt', 'text']:
            extracted_text = extract_text_from_txt(file_content)
        elif file_type.lower() in ['pdf']:
            extracted_text = extract_text_from_pdf(file_content)
        elif file_type.lower() in ['docx', 'doc']:
            extracted_text = extract_text_from_docx(file_content)
        else:
            return {
                'statusCode': 400,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({'error': f'Unsupported file type: {file_type}'}),
                'isBase64Encoded': False
            }
        
        if not extracted_text or len(extracted_text) < 10:
            return {
                'statusCode': 400,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({'error': 'No text extracted from file'}),
                'isBase64Encoded': False
            }
        
        database_url = os.environ.get('DATABASE_URL')
        if not database_url:
            return {
                'statusCode': 500,
                'headers': {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*'
                },
                'body': json.dumps({'error': 'Database not configured'}),
                'isBase64Encoded': False
            }
        
        conn = psycopg2.connect(database_url)
        cursor = conn.cursor(cursor_factory=RealDictCursor)
        
        cursor.execute("""
            INSERT INTO materials (name, file_type, content, questions_generated)
            VALUES (%s, %s, %s, 0)
            RETURNING id, name, file_type, upload_date, questions_generated
        """, (file_name, file_type.upper(), extracted_text))
        
        material = cursor.fetchone()
        conn.commit()
        
        cursor.close()
        conn.close()
        
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({
                'material': dict(material),
                'text_length': len(extracted_text),
                'preview': extracted_text[:200]
            }, default=str),
            'isBase64Encoded': False
        }
        
    except Exception as e:
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({
                'error': f'Upload failed: {str(e)}'
            }),
            'isBase64Encoded': False
        }
