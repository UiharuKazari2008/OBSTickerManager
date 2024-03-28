const express = require('express');
const fs = require('fs');
const moment = require('moment');
const config = require("./config.json");

const app = express();
const PORT = 5533;

let activeKey = undefined
let restoreTimer = null;

app.use(express.json());

async function startAutoRestore(_input) {
    let time = config.restore_time || 60;
    if (_input && !isNaN(parseInt(_input)) > 0)
        time = parseInt(_input);
    const timeout = time * 1000;
    if (restoreTimer !== null) {
        clearTimeout(restoreTimer);
        restoreTimer = null;
    }
    const textFiles = JSON.parse(fs.readFileSync(`./text.json`).toString());
    if (Object.keys(textFiles).indexOf(activeKey) !== -1 && textFiles[activeKey] && textFiles[activeKey].length > 0) {
        let content = (textFiles[activeKey]).toString();
        restoreTimer = setTimeout(() => {
            try {
                fs.writeFileSync('./output.txt', (content.padEnd(config.padding || 10, config.padding_char || " ")).toString(), {encoding: "utf8"})
                console.log(`Restore (Expire): ${content}`);
            } catch (e) {
                console.error(`Failed to restore text: ${e.message}`)
            }
        }, timeout);
    }
}

app.get('/set', (req, res) => {
    try {
        if (req.query.text && (req.query.text).length > 0) {
            let content = decodeURIComponent(req.query.text);
            fs.writeFileSync('./output.txt', (content.padEnd(config.padding || 10, config.padding_char || " ")).toString(), {encoding: "utf8"})
            console.log(`Override: ${content}`);
            res.status(200).send('Content Saved successfully');
            startAutoRestore(req.query.time);
        } else {
            res.status(404).send("Text Parameter Missing");
        }
    } catch (e) {
        res.status(500).send(`System Error: ${e.message}`);
    }
});
app.get('/load/:key', (req, res) => {
    try {
        if (fs.existsSync(`./text.json`)) {
            const textFiles = JSON.parse(fs.readFileSync(`./text.json`).toString());
            const key = req.params.key;
            if (Object.keys(textFiles).indexOf(key) !== -1 && textFiles[key] && textFiles[key].length > 0) {
                let content = (textFiles[key]).toString();
                activeKey = key;
                fs.writeFileSync('./output.txt', (content.padEnd(config.padding || 10, config.padding_char || " ")).toString(), {encoding: "utf8"})
                console.log(`Output: ${content}`);
                res.status(200).send('Content updated successfully');
            } else {
                res.status(404).send("Text Key Not Found");
            }
        } else {
            res.status(404).send("Text Files Missing");
        }
    } catch (e) {
        res.status(500).send(`System Error: ${e.message}`);
    }
});
app.get('/restore', (req, res) => {
    try {
        if (fs.existsSync(`./text.json`)) {
            const textFiles = JSON.parse(fs.readFileSync(`./text.json`).toString());
            if (Object.keys(textFiles).indexOf(activeKey) !== -1 && textFiles[activeKey] && textFiles[activeKey].length > 0) {
                let content = textFiles[activeKey];
                fs.writeFileSync('./output.txt', (content.padEnd(config.padding || 10, config.padding_char || " ")).toString(), {encoding: "utf8"})
                console.log(`Restored: ${content}`);
                res.status(200).send('Content restored successfully');
            } else {
                res.status(404).send("Text Key Not Found");
            }
        } else {
            res.status(404).send("Text Files Missing");
        }
    } catch (e) {
        res.status(500).send(`System Error: ${e.message}`);
    }
});

if (config.time && config.time.length > 0) {
    let lastValue = [];
    setInterval(() => {
        config.time.map((f,i) => {
            const time = moment().format(f || "HH:mm").toString();
            if (!lastValue[i] || lastValue[i] !== time) {
                try {
                    fs.writeFileSync(`./time-${i}.txt`, time, {encoding: "utf8"});
                } catch (e) {
                    console.error(`Failed to update time: ${e.message}`)
                }
                lastValue[i] = time;
            }
        })
    }, 1000);
}

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
