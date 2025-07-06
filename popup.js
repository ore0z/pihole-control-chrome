document.addEventListener('DOMContentLoaded', function() {
    displaySavedSettings();
    document.getElementById('addPiholeButton').addEventListener('click', addNewPihole);
    document.getElementById('disableAllPiholeButton').addEventListener('click', disableAllPihole);
    document.getElementById('enableAllPiholeButton').addEventListener('click', enableAllPihole);
});

function addNewPihole() {
    var newAddress = document.getElementById('newPiholeAddress').value.trim();
    var newPassword = document.getElementById('newApiKey').value.trim();

    if (newAddress && newPassword) {
        chrome.storage.local.get('piholeSettings', function(result) {
            var piholeSettings = result.piholeSettings || [];
            piholeSettings.push({ address: newAddress, password: newPassword });

            chrome.storage.local.set({ 'piholeSettings': piholeSettings }, function() {
                displaySavedSettings();
                document.getElementById('newPiholeAddress').value = ''; // Clear the input fields
                document.getElementById('newApiKey').value = '';
            });
        });
    }
}

function disableAllPihole() {
    var selectedDuration = parseInt(document.getElementById('disableDuration').value);
    makeApiCallForAllPihole(false, selectedDuration).then(() => {
        window.close();
    });
}

function enableAllPihole() {
    makeApiCallForAllPihole(true, 0).then(() => {
        window.close();
    });
}



async function getSessionId(address, password) {
    try {
        console.log(`Authenticating with Pi-hole at ${address}...`);
        
        const response = await fetch(`http://${address}/api/auth`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ password: password })
        });

        if (!response.ok) {
            throw new Error(`Authentication failed with status: ${response.status}`);
        }

        const data = await response.json();
        const sid = data.session?.sid;
        
        if (!sid) {
            throw new Error('No session ID received from authentication');
        }

        console.log(`Successfully authenticated with Pi-hole at ${address}`);
        return sid;
    } catch (error) {
        console.error(`Error authenticating with Pi-hole at ${address}:`, error);
        return null;
    }
}

async function makeApiCallForAllPihole(enable, duration = 0) {
    return new Promise((resolve, reject) => {
        chrome.storage.local.get('piholeSettings', async function(result) {
            if (result.piholeSettings && result.piholeSettings.length > 0) {
                console.log(`Processing ${result.piholeSettings.length} Pi-hole(s)...`);
                
                const promises = result.piholeSettings.map(async (setting, index) => {
                    try {
                        console.log(`Processing Pi-hole ${index + 1}/${result.piholeSettings.length}: ${setting.address}`);
                        
                        // Step 1: Authenticate to get session ID
                        const authResult = await getSessionId(setting.address, setting.password);
                        if (!authResult) {
                            throw new Error(`Failed to authenticate with Pi-hole at ${setting.address}`);
                        }
                        
                        // Step 2: Make the blocking API call
                        const payload = {
                            blocking: enable,
                            timer: duration
                        };

                        const response = await fetch(`http://${setting.address}/api/dns/blocking`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'sid': authResult
                            },
                            body: JSON.stringify(payload)
                        });

                        if (!response.ok) {
                            throw new Error(`Blocking API call failed with status: ${response.status}`);
                        }

                        console.log(`Successfully ${enable ? 'enabled' : 'disabled'} Pi-hole at ${setting.address}`);
                    } catch (error) {
                        console.error(`Error ${enable ? 'enabling' : 'disabling'} Pi-hole at ${setting.address}:`, error);
                        throw error;
                    }
                });

                try {
                    await Promise.all(promises);
                    console.log(`Completed processing all ${result.piholeSettings.length} Pi-hole(s)`);
                    resolve();
                } catch (error) {
                    reject(error);
                }
            } else {
                console.log('No Pi-hole settings saved.');
                resolve();
            }
        });
    });
}

function displaySavedSettings() {
    chrome.storage.local.get('piholeSettings', function(result) {
        const settingsContainer = document.getElementById('savedPiholeSettings');
        settingsContainer.innerHTML = '';

        if (result.piholeSettings && result.piholeSettings.length > 0) {
            result.piholeSettings.forEach((setting, index) => {
                // Container div for each setting line
                const settingLineDiv = document.createElement('div');
                settingLineDiv.className = 'settingLine';

                // Div for displaying the address
                const addressDiv = document.createElement('div');
                addressDiv.textContent = `Address: ${setting.address}`;
                addressDiv.className = 'addressDiv';

                // Create the delete button
                var deleteButton = document.createElement('button');
                deleteButton.className = 'deleteButton';
                deleteButton.textContent = 'Delete';
                deleteButton.addEventListener('click', function() {
                    deleteSetting(index);
                });

                settingLineDiv.appendChild(addressDiv);
                settingLineDiv.appendChild(deleteButton);
                settingsContainer.appendChild(settingLineDiv);
            });
        } else {
            settingsContainer.textContent = 'No saved Pi-hole settings.';
        }
    });
}

function deleteSetting(index) {
    chrome.storage.local.get('piholeSettings', function(result) {
        var piholeSettings = result.piholeSettings || [];
        if (index >= 0 && index < piholeSettings.length) {
            piholeSettings.splice(index, 1);

            chrome.storage.local.set({ 'piholeSettings': piholeSettings }, function() {
                displaySavedSettings();
            });
        }
    });
}
