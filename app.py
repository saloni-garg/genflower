from flask import Flask, render_template, request, jsonify, send_file
from flowchart_renderer import render_flowchart
from openai import OpenAI
import os
import json
import logging
import time
from dotenv import load_dotenv


# Load environment variables from .env file
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

app = Flask(__name__)

# Configure OpenAI
api_key = os.getenv('OPENAI_API_KEY')
if not api_key:
    logger.error("OPENAI_API_KEY environment variable is not set")
    raise ValueError("OPENAI_API_KEY environment variable is not set")

client = OpenAI(api_key=api_key)

@app.route('/')
def home():
    return render_template('index.html')

@app.route('/generate_flowchart', methods=['POST'])
def generate_flowchart_endpoint():
    max_retries = 5
    retry_count = 0
    
    while retry_count < max_retries:
        try:
            topic = request.json.get('topic')
            if not topic:
                return jsonify({'error': 'No topic provided'}), 400

            logger.debug(f"Generating flowchart for topic: {topic} (Attempt {retry_count + 1}/{max_retries})")

            # Construct the prompt for OpenAI
            prompt = f"""Create a very elaborate flowchart for the input: {topic}, treating it as a complete technical process. Use a lot of conditional nodes and edges, and make sure to include all possible branches and decisions. Consider all possible scenarios and edge cases, generate at least 25 nodes.

The flowchart should be represented as a list of tuples in the following format:
[
    (node_id, node_text, node_type, [outgoing_edges]),
    ...
]

Where:
- node_id: A unique identifier for the node (string)
- node_text: The text to display in the node (string)
- node_type: Either 'block' for regular process steps or 'conditional' for decision points (string)
- outgoing_edges: A list of tuples, each containing (target_node_id, edge_label)
  - target_node_id: The ID of the node this edge connects to
  - edge_label: The text to display on the edge (e.g., 'Yes', 'No', 'Success', 'Error', etc.)

Example:
[
    ('start', 'Begin Process', 'block', [('check', 'Start')]),
    ('check', 'Is Data Valid?', 'conditional', [('process', 'Yes'), ('error', 'No')]),
    ('process', 'Process Data', 'block', [('end', 'Complete')]),
    ('error', 'Show Error', 'block', [('end', 'Return')]),
    ('end', 'End Process', 'block', [])
]

Rules:
1. Every node must have at least one outgoing arrow or be the target of at least one outgoing arrow
2. Use 'conditional' type for decision points (will be rendered as diamonds)
3. Use 'block' type for process steps (will be rendered as rectangles)
4. Include meaningful edge labels for all connections
5. For conditional nodes, typically use 'Yes'/'No' or 'True'/'False' as edge labels
6. For process flows, use action-oriented labels like 'Next', 'Continue', 'Return', etc.

Please ensure the response is ONLY the flowchart data in the exact format shown above, with no additional text or explanation. Make sure to include all possible branches and decisions. Make sure every node has at least one outgoing arrow or is the target of at least one outgoing arrow for any other node."""

            logger.debug("Sending request to OpenAI")
            # Get response from OpenAI using the new API
            response = client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[
                    {"role": "system", "content": "You are a helpful assistant that creates flowchart data structures."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.7,
                max_tokens=1000
            )

            # Extract the flowchart data from the response
            flowchart_data = response.choices[0].message.content.strip()
            logger.debug(f"Received flowchart data: {flowchart_data}")
            
            # Render the flowchart
            logger.debug("Attempting to render flowchart")
            output_path = render_flowchart(flowchart_data)
            
            if output_path:
                logger.debug(f"Flowchart rendered successfully at: {output_path}")
                # Return the path with 'static/' prefix
                image_path = output_path.replace('static/', '')
                return jsonify({
                    'success': True, 
                    'image_path': f"static/{image_path}",
                    'flowchart_data': flowchart_data
                })
            else:
                logger.error("Failed to render flowchart")
                retry_count += 1
                if retry_count < max_retries:
                    logger.info(f"Retrying flowchart generation (Attempt {retry_count + 1}/{max_retries})")
                    time.sleep(1)  # Wait a second before retrying
                    continue
                else:
                    return jsonify({'error': 'Failed to generate flowchart after multiple attempts'}), 500

        except ValueError as e:
            error_message = str(e)
            if "Sorry a known bug" in error_message:
                retry_count += 1
                if retry_count < max_retries:
                    logger.info(f"Encountered known bug, retrying (Attempt {retry_count + 1}/{max_retries})")
                    time.sleep(1)  # Wait a second before retrying
                    continue
                else:
                    logger.error(f"Failed to generate flowchart after {max_retries} attempts: {error_message}")
                    return jsonify({'error': f'Failed to generate flowchart after {max_retries} attempts. Please try again later.'}), 500
            else:
                logger.error(f"Error generating flowchart: {error_message}")
                return jsonify({'error': error_message}), 500
                
        except Exception as e:
            logger.error(f"Error generating flowchart: {str(e)}", exc_info=True)
            return jsonify({'error': str(e)}), 500
    
    # If we've exhausted all retries
    return jsonify({'error': f'Failed to generate flowchart after {max_retries} attempts. Please try again later.'}), 500

@app.route('/static/<path:filename>')
def serve_static(filename):
    return send_file(f'static/{filename}')

if __name__ == '__main__':
    app.run(debug=True) 