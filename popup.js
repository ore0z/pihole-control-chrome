document.addEventListener('DOMContentLoaded', function() {
    displaySavedSettings();
    document.getElementById('addPiholeButton').addEventListener('click', addNewPihole);
});

function addNewPihole() {
    var newAddress = document.getElementById('newPiholeAddress').value.trim();
    var newKey = document.getElementById('newApiKey').value.trim();

    if (newAddress && newKey) {
        chrome.storage.local.get('piholeSettings', function(result) {
            var piholeSettings = result.piholeSettings || [];
            piholeSettings.push({ address: newAddress, key: newKey });

            chrome.storage.local.set({ 'piholeSettings': piholeSettings }, function() {
                displaySavedSettings();
                document.getElementById('newPiholeAddress').value = ''; // Clear the input fields
                document.getElementById('newApiKey').value = '';
            });
        });
    }
}

document.addEventListener('DOMContentLoaded', function() {
    displaySavedSettings();
    document.getElementById('addPiholeButton').addEventListener('click', addNewPihole);
    document.getElementById('disableAllPiholeButton').addEventListener('click', disableAllPihole);
    document.getElementById('enableAllPiholeButton').addEventListener('click', enableAllPihole);
});

function disableAllPihole() {
    var selectedDuration = document.getElementById('disableDuration').value;
    makeApiCallForAllPihole(`disable=${selectedDuration}`).then(() => {
        window.close();
    });
}

function enableAllPihole() {
    makeApiCallForAllPihole('enable').then(() => {
        window.close();
    });
}

function makeApiCallForAllPihole(query) {
    return new Promise((resolve, reject) => {
        chrome.storage.local.get('piholeSettings', function(result) {
            if (result.piholeSettings && result.piholeSettings.length > 0) {
                const promises = result.piholeSettings.map(setting => 
                    fetch(`http://${setting.address}/admin/api.php?${query}&auth=${setting.key}`, {
                        mode: 'no-cors'
                    })
                    .then(response => {
                        console.log(`Request sent to Pi-hole at ${setting.address}`);
                    })
                    .catch(error => {
                        console.error(`Error ${query.startsWith('disable') ? 'disabling' : 'enabling'} Pi-hole at ${setting.address}:`, error);
                        throw error;
                    })
                );

                Promise.all(promises)
                    .then(() => resolve())
                    .catch(error => reject(error));
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
