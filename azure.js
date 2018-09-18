"use strict";

const azureDirectLineApiAuthenticationUrl = 'https://directline.botframework.com/v3/directline/tokens/generate';
const azureDirectLineApiConversationUrl = 'https://directline.botframework.com/v3/directline/conversations';

const axios = require('axios');
const cache = {};


exports.send = async function (uuid, message) {
    let authenticationToken = await authenticate(uuid);
    let conversation = await startConversation(authenticationToken);
    let activityId = await sendActivity(uuid, conversation.id, conversation.token, message);
    // TODO: use retries with delay instead
    await waitFor(1000);
    let activities = await listActivities(conversation.id, conversation.token);
    let lastActivity = activities[activities.length - 1];

    if (lastActivity.replyToId == activityId) {
        console.log(`Chatbot replied: ${lastActivity.text}`);
        return lastActivity.text;
    }
    else {
        let errorMessage = "Chatbot didn't reply yet.";
        throw new Error(errorMessage);
    }
}

async function waitFor(delay) {
    return new Promise(function (resolve, reject) {
        setTimeout(function () { resolve(); }, delay);
    });
}

async function authenticate(uuid) {
    if (cache[uuid] && cache[uuid]['authenticationToken']) {
        console.log('Authetication token read from cache');
        return cache[uuid]['authenticationToken'];
    }

    let body = {};
    let config = {
        headers: { 'Authorization': 'Bearer ' + process.env.AZURE_DIRECT_LINE_SECRET }
    };

    console.log('Sending request to get authentication token...');

    let response = await axios.post(azureDirectLineApiAuthenticationUrl, body, config);
    if (response.status != 200) {
        errorMessage = `Azure Direct Line API Authentication Process returned: ${response.status} ${response.status}`;
        throw new Error(errorMessage);
    }
    else {
        // TODO: handle response.data.expires_in (1800)
        return response.data.token;
    }
}

function startConversation(authenticationToken) {
    return new Promise(function (resolve, reject) {
        let body = {};
        let config = {
            headers: { 'Authorization': 'Bearer ' + authenticationToken }
        };

        console.log('Sending request to get conversation token...');

        axios.post(azureDirectLineApiConversationUrl, body, config)
            .then(function (response) {
                if (response.status != 201) {
                    errorMessage = `Azure Direct Line API Start Conversation Process returned: ${response.status} ${response.status}`;
                    reject(new Error(errorMessage));
                }
                else {
                    // TODO: handle response.data.expires_in (1800)
                    // TODO: handle response.data.streamUrl
                    resolve({ token: response.data.token, id: response.data.conversationId });
                }
            })
            .catch(function (error) {
                errorMessage = `An error occured: ${error}`;
                reject(new Error(errorMessage));
            });
    });
}

function sendActivity(uuid, conversationId, conversationToken, message) {
    return new Promise(function (resolve, reject) {
        let body = { 'type': 'message', 'from': { 'id': uuid }, 'text': message };
        let config = {
            headers: { 'Authorization': 'Bearer ' + conversationToken, 'Content-Type': 'application/json' }
        };

        console.log('Sending request to send activity...');

        axios.post(`${azureDirectLineApiConversationUrl}/${conversationId}/activities`, body, config)
            .then(function (response) {
                if (response.status != 200) {
                    errorMessage = `Azure Direct Line API Send Activity Process returned: ${response.status} ${response.status}`;
                    reject(new Error(errorMessage));
                }
                else {
                    resolve(response.data.id);
                }
            })
            .catch(function (error) {
                errorMessage = `An error occured: ${error}`;
                reject(new Error(errorMessage));
            });
    });
}

function listActivities(conversationId, conversationToken) {
    return new Promise(function (resolve, reject) {
        let config = {
            headers: { 'Authorization': 'Bearer ' + conversationToken }
        };

        console.log(`Sending request to list activities...`);

        axios.get(`${azureDirectLineApiConversationUrl}/${conversationId}/activities`, config)
            .then(function (response) {
                if (response.status != 200) {
                    errorMessage = `Azure Direct Line API List Activities Process returned: ${response.status} ${response.status}`;
                    reject(new Error(errorMessage));
                }
                else {
                    // TODO: use watermark
                    resolve(response.data.activities);
                }
            })
            .catch(function (error) {
                errorMessage = `An error occured: ${error}`;
                reject(new Error(errorMessage));
            });
    });
}
