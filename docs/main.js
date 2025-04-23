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
    const resultDiv = document.getElementById('result');
    const flowchartOutput = document.getElementById('flowchartOutput');
    const flowchartContainer = document.getElementById('flowchartContainer');
    const loadingDiv = document.getElementById('loading');
    const dataLocked = document.getElementById('dataLocked');
    const dataUnlocked = document.getElementById('dataUnlocked');
    
    if (!topicInput.value.trim()) {
        alert('Please enter a topic');
        return;
    }

    // Show loading indicator
    loadingDiv.classList.remove('hidden');
    resultDiv.classList.add('hidden');

    try {
        // For GitHub Pages, we'll use a sample flowchart for demonstration
        // In a real implementation, you would call an API or use a client-side library
        
        // Simulate API call delay
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Use sample data for demonstration
        const flowchartData = sampleFlowchartData;
        const flowchartDataStr = JSON.stringify(flowchartData, null, 2);
        
        // Generate mermaid code
        const mermaidCode = generateFlowchartMermaid(flowchartData);
        
        // Hide loading indicator
        loadingDiv.classList.add('hidden');
        
        // Show result
        resultDiv.classList.remove('hidden');
        
        // Reset the data section to locked state
        flowchartOutput.classList.add('hidden');
        dataLocked.classList.remove('hidden');
        dataUnlocked.classList.add('hidden');
        document.getElementById('dataPassword').value = '';
        
        // Store the flowchart data for later use
        flowchartOutput.textContent = flowchartDataStr;
        
        // Display the flowchart using mermaid
        flowchartContainer.innerHTML = `<div class="mermaid">${mermaidCode}</div>`;
        
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

function unlockData() {
    const password = document.getElementById('dataPassword').value;
    const flowchartOutput = document.getElementById('flowchartOutput');
    const dataLocked = document.getElementById('dataLocked');
    const dataUnlocked = document.getElementById('dataUnlocked');
    
    if (password === 'yesyes') {
        // Correct password, show the data
        flowchartOutput.classList.remove('hidden');
        dataLocked.classList.add('hidden');
        dataUnlocked.classList.remove('hidden');
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