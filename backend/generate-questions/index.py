import json
import os
from typing import Dict, Any, List
import psycopg2
from psycopg2.extras import RealDictCursor

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    '''
    Business: Generate exam questions from uploaded material text using OpenAI GPT-4
    Args: event with httpMethod, body containing materialText, difficulty, questionCount
          context with request_id attribute
    Returns: HTTP response with generated questions list
    '''
    method: str = event.get('httpMethod', 'GET')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, X-User-Id',
                'Access-Control-Max-Age': '86400'
            },
            'body': '',
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
    material_id: int = body_data.get('materialId')
    difficulty: str = body_data.get('difficulty', 'medium')
    question_count: int = body_data.get('questionCount', 5)
    
    if not material_id:
        return {
            'statusCode': 400,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({'error': 'materialId is required'}),
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
    
    cursor.execute("SELECT content FROM materials WHERE id = %s", (material_id,))
    material = cursor.fetchone()
    
    if not material:
        cursor.close()
        conn.close()
        return {
            'statusCode': 404,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({'error': 'Material not found'}),
            'isBase64Encoded': False
        }
    
    material_text = material['content']
    
    openai_api_key = os.environ.get('OPENAI_API_KEY')
    if not openai_api_key:
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({'error': 'OpenAI API key not configured'}),
            'isBase64Encoded': False
        }
    
    try:
        from openai import OpenAI
        client = OpenAI(api_key=openai_api_key)
        
        difficulty_map = {
            'easy': 'легкие вопросы для начинающих',
            'medium': 'вопросы средней сложности',
            'hard': 'сложные вопросы для продвинутых'
        }
        
        prompt = f"""На основе следующего учебного материала сгенерируй {question_count} {difficulty_map.get(difficulty, 'вопросы средней сложности')} для экзамена.

Материал:
{material_text[:3000]}

Требования:
- Вопросы должны быть конкретными и проверять понимание материала
- Формат: каждый вопрос с новой строки, нумерованный
- Вопросы должны быть на русском языке
- Разнообразные типы вопросов: определения, примеры, решение задач

Верни только список вопросов без дополнительных комментариев."""

        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "Ты опытный преподаватель, который создает качественные экзаменационные вопросы."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.7,
            max_tokens=1500
        )
        
        generated_text = response.choices[0].message.content
        questions_lines = [line.strip() for line in generated_text.split('\n') if line.strip() and any(char.isdigit() for char in line[:5])]
        
        questions = []
        for i, line in enumerate(questions_lines[:question_count]):
            question_text = line.split('.', 1)[-1].strip() if '.' in line else line.strip()
            
            cursor.execute("""
                INSERT INTO questions (material_id, text, difficulty)
                VALUES (%s, %s, %s)
                RETURNING id, text, difficulty, created_at
            """, (material_id, question_text, difficulty))
            
            question = cursor.fetchone()
            questions.append(dict(question))
        
        cursor.execute("""
            UPDATE materials 
            SET questions_generated = questions_generated + %s
            WHERE id = %s
        """, (len(questions), material_id))
        
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
                'questions': questions,
                'count': len(questions),
                'model': 'gpt-4o-mini'
            }, default=str),
            'isBase64Encoded': False
        }
        
    except Exception as e:
        if 'conn' in locals():
            conn.rollback()
            cursor.close()
            conn.close()
        return {
            'statusCode': 500,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            },
            'body': json.dumps({
                'error': f'Generation failed: {str(e)}'
            }),
            'isBase64Encoded': False
        }