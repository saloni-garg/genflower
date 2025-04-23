// This is a client-side version of the flowchart generator for GitHub Pages
// It uses the browser's localStorage to store generated flowcharts

// Sample flowchart data for demonstration
const sampleFlowchartData = [
    ['start', 'Begin Process', 'block', [['check', 'Start']]],
    ['check', 'Is Data Valid?', 'conditional', [['process', 'Yes'], ['error', 'No']]],
    ['process', 'Process Data', 'block', [['end', 'Complete']]],
    ['error', 'Show Error', 'block', [['end', 'Return']]],
    ['end', 'End Process', 'block', []]
];

// Function to generate a flowchart using mermaid.js
function generateFlowchartMermaid(flowchartData) {
    let mermaidCode = 'graph TD;\n';
    
    // Create nodes
    for (const node of flowchartData) {
        const [nodeId, nodeText, nodeType, outgoingEdges] = node;
        
        // Set node shape based on type
        if (nodeType === 'conditional') {
            mermaidCode += `    ${nodeId}[${nodeText}]:::conditional\n`;
        } else {
            mermaidCode += `    ${nodeId}[${nodeText}]:::block\n`;
        }
    }
    
    // Create edges
    for (const node of flowchartData) {
        const [nodeId, , nodeType, outgoingEdges] = node;
        
        for (const [targetId, edgeLabel] of outgoingEdges) {
            if (nodeType === 'conditional' && edgeLabel) {
                // Add label only for edges from conditional nodes
                mermaidCode += `    ${nodeId} -->|${edgeLabel}| ${targetId}\n`;
            } else {
                // No label for edges from non-conditional nodes
                mermaidCode += `    ${nodeId} --> ${targetId}\n`;
            }
        }
    }
    
    // Add styles
    mermaidCode += `
    classDef block fill:#dae8fc,stroke:#6c8ebf,stroke-width:1px;
    classDef conditional fill:#fff2cc,stroke:#d6b656,stroke-width:1px;
    `;
    
    return mermaidCode;
}

// Function to generate a flowchart using the OpenAI API
async function generateFlowchart() {
    const topicInput = document.getElementById('topic');
    const apiKeyInput = document.getElementById('apiKey');
    const resultDiv = document.getElementById('flowchartContainer');
    const flowchartOutput = document.getElementById('mermaidFlowchart');
    const loadingDiv = document.getElementById('loadingIndicator');
    const dataLocked = document.getElementById('dataLocked');
    const dataUnlocked = document.getElementById('dataUnlocked');
    const flowchartData = document.getElementById('flowchartData');
    
    if (!topicInput.value.trim()) {
        alert('Please enter a topic');
        return;
    }

    if (!apiKeyInput.value.trim()) {
        alert('Please enter your OpenAI API key');
        return;
    }

    // Show loading indicator
    loadingDiv.classList.remove('hidden');
    resultDiv.classList.add('hidden');
    document.getElementById('dataSection').classList.add('hidden');

    try {
        // Construct the prompt for OpenAI
        const prompt = `Create a very elaborate flowchart for the input: ${topicInput.value}, treating it as a complete technical process. Use a lot of conditional nodes and edges, and make sure to include all possible branches and decisions. Consider all possible scenarios and edge cases, generate at least 25 nodes.

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

Please ensure the response is ONLY the flowchart data in the exact format shown above, with no additional text or explanation. Make sure to include all possible branches and decisions. Make sure every node has at least one outgoing arrow or is the target of at least one outgoing arrow for any other node.`;

        // Call the OpenAI API
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKeyInput.value}`
            },
            body: JSON.stringify({
                model: 'gpt-3.5-turbo',
                messages: [
                    { role: 'system', content: 'You are a helpful assistant that creates flowchart data structures.' },
                    { role: 'user', content: prompt }
                ],
                temperature: 0.7,
                max_tokens: 1000
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`OpenAI API error: ${errorData.error?.message || 'Unknown error'}`);
        }

        const data = await response.json();
        const flowchartDataStr = data.choices[0].message.content.trim();
        
        // Parse the flowchart data
        let flowchartDataObj;
        try {
            // Try to parse as Python literal
            flowchartDataObj = eval(`(${flowchartDataStr})`);
        } catch (e) {
            try {
                // Try to parse as JSON
                flowchartDataObj = JSON.parse(flowchartDataStr.replace(/'/g, '"').replace(/\(/g, '[').replace(/\)/g, ']'));
            } catch (e) {
                throw new Error('Failed to parse flowchart data');
            }
        }
        
        // Generate mermaid code
        const mermaidCode = generateFlowchartMermaid(flowchartDataObj);
        
        // Hide loading indicator
        loadingDiv.classList.add('hidden');
        
        // Show result
        resultDiv.classList.remove('hidden');
        document.getElementById('dataSection').classList.remove('hidden');
        
        // Reset the data section to locked state
        dataLocked.classList.remove('hidden');
        dataUnlocked.classList.add('hidden');
        document.getElementById('dataPassword').value = '';
        
        // Store the flowchart data for later use
        flowchartData.textContent = flowchartDataStr;
        
        // Display the flowchart using mermaid
        flowchartOutput.innerHTML = mermaidCode;
        
        // Initialize mermaid
        mermaid.initialize({ startOnLoad: true });
        
        // Store in localStorage for persistence
        localStorage.setItem('lastFlowchart', flowchartDataStr);
        localStorage.setItem('lastTopic', topicInput.value);
        
    } catch (error) {
        loadingDiv.classList.add('hidden');
        alert('Error generating flowchart: ' + error.message);
    }
}

// Function to unlock data section
function unlockData() {
    const password = document.getElementById('dataPassword').value;
    const dataLocked = document.getElementById('dataLocked');
    const dataUnlocked = document.getElementById('dataUnlocked');
    
    if (password === 'yesyes') {
        // Correct password, show the data
        dataLocked.classList.add('hidden');
        dataUnlocked.classList.remove('hidden');
        document.getElementById('dataPassword').value = '';
    } else {
        // Incorrect password
        alert('Incorrect password. Please try again.');
        document.getElementById('dataPassword').value = '';
    }
}

// Load the last generated flowchart on page load
document.addEventListener('DOMContentLoaded', function() {
    const lastFlowchart = localStorage.getItem('lastFlowchart');
    const lastTopic = localStorage.getItem('lastTopic');
    
    if (lastFlowchart && lastTopic) {
        const topicInput = document.getElementById('topic');
        topicInput.value = lastTopic;
        
        // Generate the flowchart
        generateFlowchart();
    }
}); 