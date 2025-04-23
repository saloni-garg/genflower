async function generateFlowchart() {
    const topicInput = document.getElementById('topic');
    const resultDiv = document.getElementById('result');
    const flowchartOutput = document.getElementById('flowchartOutput');
    const flowchartImage = document.getElementById('flowchartImage');
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
        const response = await fetch('/generate_flowchart', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ topic: topicInput.value })
        });

        const data = await response.json();
        
        if (data.success) {
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
            flowchartOutput.textContent = data.flowchart_data;
            
            // Display the flowchart image
            if (data.image_path) {
                // Add a timestamp to prevent caching
                const timestamp = new Date().getTime();
                flowchartImage.src = `${data.image_path}?t=${timestamp}`;
                
                flowchartImage.onload = function() {
                    // Image loaded successfully
                    console.log("Flowchart image loaded successfully");
                };
                
                flowchartImage.onerror = function() {
                    // Image failed to load
                    console.error("Failed to load flowchart image");
                    flowchartImage.alt = "Failed to load flowchart image";
                };
            }
        } else {
            loadingDiv.classList.add('hidden');
            alert('Error: ' + data.error);
        }
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