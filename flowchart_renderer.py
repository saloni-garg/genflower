import graphviz
import ast
import json
import re
import logging
import os
import time
from collections import defaultdict

# Configure logging
logger = logging.getLogger(__name__)

def render_flowchart(flowchart_data_str):
    """
    Render a flowchart using Graphviz based on the provided data.
    The flowchart data should be a string representation of a list of tuples,
    where each tuple contains (node_id, node_text, node_type, outgoing_edges).
    outgoing_edges is a list of tuples (target_node_id, edge_label).
    Only edges from conditional nodes will display labels.
    """
    try:
        # Clean up the input string and extract the flowchart data
        flowchart_data_str = flowchart_data_str.strip()
        
        # Remove any markdown code block syntax
        if flowchart_data_str.startswith('```'):
            flowchart_data_str = flowchart_data_str.split('```')[1]
        if flowchart_data_str.startswith('python'):
            flowchart_data_str = flowchart_data_str[6:]
            
        # Fix common syntax errors
        # Check if the string starts with [ but doesn't end with ]
        if flowchart_data_str.startswith('[') and not flowchart_data_str.rstrip().endswith(']'):
            logger.info("Adding missing closing bracket to flowchart data")
            flowchart_data_str = flowchart_data_str.rstrip() + ']'
            
        # Fix missing commas between list items
        flowchart_data_str = re.sub(r'\)\s*\n\s*\(', '),\n(', flowchart_data_str)
        
        # Try to parse the flowchart data string
        try:
            logger.debug("Attempting to parse as Python literal")
            flowchart_data = ast.literal_eval(flowchart_data_str)
            logger.debug("Successfully parsed as Python literal")
        except (SyntaxError, ValueError) as e:
            logger.debug(f"Failed to parse as Python literal: {e}")
            try:
                # If that fails, try to parse as JSON
                logger.debug("Attempting to parse as JSON")
                # First, convert Python tuple syntax to JSON array syntax
                fixed_json = flowchart_data_str.replace('(', '[').replace(')', ']')
                flowchart_data = json.loads(fixed_json)
                logger.debug("Successfully parsed as JSON")
            except json.JSONDecodeError as e:
                logger.error(f"Failed to parse flowchart data: {e}")
                # Last resort: try to fix the JSON and parse again
                try:
                    # Replace single quotes with double quotes for JSON
                    fixed_json = flowchart_data_str.replace("'", '"')
                    # Convert Python tuple syntax to JSON array syntax
                    fixed_json = fixed_json.replace('(', '[').replace(')', ']')
                    flowchart_data = json.loads(fixed_json)
                    logger.debug("Successfully parsed after fixing JSON format")
                except json.JSONDecodeError:
                    raise ValueError("Sorry a known bug, please try again and it should work.")

        # Convert JSON arrays back to tuples if needed
        if isinstance(flowchart_data, list):
            flowchart_data = [tuple(node) if isinstance(node, list) else node for node in flowchart_data]

        # Deduplicate nodes with the same ID
        unique_nodes = {}
        for node in flowchart_data:
            if len(node) != 4:
                logger.warning(f"Skipping invalid node format: {node}")
                continue
                
            node_id, node_text, node_type, outgoing_edges = node
            
            # Convert outgoing_edges to list of tuples if it's a list of lists
            if isinstance(outgoing_edges, list):
                outgoing_edges = [tuple(edge) if isinstance(edge, list) else edge for edge in outgoing_edges]
            
            # If we've seen this node ID before, merge the outgoing edges
            if node_id in unique_nodes:
                logger.info(f"Deduplicating node with ID: {node_id}")
                # Merge outgoing edges, avoiding duplicates
                existing_edges = unique_nodes[node_id][3]
                for target_id, edge_label in outgoing_edges:
                    if (target_id, edge_label) not in existing_edges:
                        existing_edges.append((target_id, edge_label))
            else:
                # First time seeing this node ID
                unique_nodes[node_id] = (node_id, node_text, node_type, outgoing_edges)

        # Create a new directed graph
        dot = graphviz.Digraph(comment='Flowchart')
        dot.attr(rankdir='TB', size='11.7,8.3', dpi='300')
        
        # Set default node and edge attributes
        dot.attr('node', shape='rectangle', style='filled', fillcolor='lightblue',
                fontname='Arial', fontsize='12', margin='0.2,0.1')
        dot.attr('edge', fontname='Arial', fontsize='10', color='#666666')

        # Add nodes and edges
        for node_id, node in unique_nodes.items():
            node_text, node_type, outgoing_edges = node[1], node[2], node[3]
            
            # Set node shape based on type
            if node_type == 'conditional':
                dot.node(node_id, node_text, shape='diamond', fillcolor='lightyellow')
            else:
                dot.node(node_id, node_text, fillcolor='lightblue')
            
            # Add edges with labels only for conditional nodes
            for target_id, edge_label in outgoing_edges:
                if target_id is not None:
                    if node_type == 'conditional' and edge_label is not None:
                        # Add label only for edges from conditional nodes
                        dot.edge(node_id, target_id, label=edge_label)
                    else:
                        # No label for edges from non-conditional nodes
                        dot.edge(node_id, target_id)

        # Ensure the static directory exists
        os.makedirs('static', exist_ok=True)
        
        # Generate a unique filename based on timestamp
        timestamp = int(time.time())
        output_path = f'static/flowchart_{timestamp}'
        
        # Render the graph
        dot.render(output_path, format='png', cleanup=True)
        return f"{output_path}.png"

    except Exception as e:
        logger.error(f"Error rendering flowchart: {e}")
        raise 