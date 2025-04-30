const voteCountsDiv = document.getElementById('vote-counts');
const voteChartCanvas = document.getElementById('voteChart');
const validationErrorsDiv = document.getElementById('validation-errors');
let voteChart;

// Function to get candidate name (replace with your actual logic)
function getCandidateName(candidateId) {
    const candidateNames = {
        "ganesh_iyer": "Ganesh Iyer",
        "akila_devi": "Akila Devi",
        "arjun_reddy": "Arjun Reddy",
        "divya_sharma": "Divya Sharma",
        "keerthi_nair": "Keerthi Nair",
        "meena_srinivasan": "Meena Srinivasan",
        "priya_sharma": "Priya Sharma",
        "ramesh_kumar": "Ramesh Kumar",
        "suresh_gopi": "Suresh Gopi",
        "vijay_kumar": "Vijay Kumar"
        // Add other candidates as needed
    };
    return candidateNames[candidateId] || candidateId;
}

function processAndDisplayResults(results) {
    const voteCounts = {};
    if (results && results.validVotes) {
        results.validVotes.forEach(vote => {
            const candidateId = vote.candidateId;
            voteCounts[candidateId] = (voteCounts[candidateId] || 0) + 1;
        });
    }

    voteCountsDiv.innerHTML = '';
    const labels = [];
    const data = [];

    for (const candidateId in voteCounts) {
        if (voteCounts.hasOwnProperty(candidateId)) {
            const count = voteCounts[candidateId];
            const candidateName = getCandidateName(candidateId);
            labels.push(candidateName);
            data.push(count);

            const candidateCard = document.createElement('div');
            candidateCard.classList.add('candidate-card');
            candidateCard.innerHTML = `
                <h3>${candidateName}</h3>
                <p class="vote-count">${count}</p>
            `;
            voteCountsDiv.appendChild(candidateCard);
        }
    }

    if (voteChart) {
        voteChart.destroy();
    }

    voteChart = new Chart(voteChartCanvas, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Vote Count',
                data: data,
                backgroundColor: 'rgba(54, 162, 235, 0.8)',
                borderColor: 'rgba(54, 162, 235, 1)',
                borderWidth: 1
            }]
        },
        options: {
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Number of Votes'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Candidate'
                    }
                }
            },
            plugins: {
                title: {
                    display: true,
                    text: 'Realtime Vote Counts',
                    fontSize: 18
                },
                legend: {
                    display: false
                }
            }
        }
    });

    // Display validation errors
    if (validationErrorsDiv) {
        validationErrorsDiv.innerHTML = '';
        if (results && results.errors && results.errors.length > 0) {
            const errorsTitle = document.createElement('h2');
            errorsTitle.textContent = 'Recent Validation Errors';
            validationErrorsDiv.appendChild(errorsTitle);
            results.errors.forEach(error => {
                const errorItem = document.createElement('div');
                errorItem.classList.add('error-item');
                errorItem.textContent = `Voter ID: ${error.voterId}, Error: ${error.error}`;
                validationErrorsDiv.appendChild(errorItem);
            });
        } else {
            const noErrorsMessage = document.createElement('p');
            noErrorsMessage.textContent = 'No recent validation errors.';
            validationErrorsDiv.appendChild(noErrorsMessage);
        }
    }
}

// Fetch data from vote_results.json
fetch('vote_results.json')
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        processAndDisplayResults(data);
    })
    .catch(error => {
        console.error('Error fetching vote results:', error);
        voteCountsDiv.innerHTML = '<p>Error loading vote results.</p>';
        if (validationErrorsDiv) {
            validationErrorsDiv.innerHTML = `<p>Error loading validation errors: ${error.message}</p>`;
        }
    });