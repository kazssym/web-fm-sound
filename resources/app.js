// app.js
// Copyright (C) 2020 Kaz Nishimura
//
// This program is free software: you can redistribute it and/or modify it
// under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or (at your
// option) any later version.
//
// This program is distributed in the hope that it will be useful, but WITHOUT
// ANY WARRANTY; without even the implied warranty of MERCHANTABILITY or
// FITNESS FOR A PARTICULAR PURPOSE.  See the GNU Affero General Public License
// for more details.
//
// You should have received a copy of the GNU Affero General Public License
// along with this program.  If not, see <http://www.gnu.org/licenses/>.
//
// SPDX-License-Identifier: AGPL-3.0-or-later

// This file is a module script and shall be in strict mode by default.

/**
 * ES module for the application.
 *
 * @module app.js
 */

/**
 * Resumes the synthesizer engine if suspended.
 */
function resumeSynthesizer()
{
    if (synthesizer.context.state == "suspended") {
        synthesizer.context.resume();
    }
}

/**
 * Sends a note-on message.
 */
function sendNoteOn()
{
    console.debug("note on");
    resumeSynthesizer();
    synthesizer.port.postMessage({
        noteOn: {
            key: 69,
        }
    });
}

/**
 * Sends a note-off message.
 */
function sendNoteOff()
{
    console.debug("note off");
    resumeSynthesizer();
    synthesizer.port.postMessage({
        noteOff: {
            key: 69,
        }
    });
}

/**
 * Handles the `change` events for the total level controls.
 *
 * @param {Event} event
 */
function handleTotalLevelChange(event) {
    let value = event.target.value;
    if (value == 0) {
        event.target.title = "-∞ dB";
    }
    else {
        event.target.title = `${0.75 * (value - 127)} dB`;
    }
}

/**
 * Binds UI commands.
 */
function bindCommands()
{
    let form = document.forms["demo"];
    for (let e of form["totalLevel"]) {
        e.addEventListener("change", handleTotalLevelChange);
        handleTotalLevelChange({target: e});
    }

    for (let e of document.getElementsByClassName("app-command-trigger")) {
        e.addEventListener("mousedown", sendNoteOn);
        e.addEventListener("mouseup", sendNoteOff);
        if (e.disabled) {
            e.disabled = false;
        }
    }
}

/**
 * Creates a custom AudioContext object.
 *
 * @return {Promise<AudioContext>}
 */
async function createAudioContext()
{
    let AudioContext = window.AudioContext;
    if (AudioContext == null) {
        AudioContext = window.webkitAudioContext;
    }

    if ("audioWorklet" in AudioContext.prototype) {
        let context = new AudioContext();
        await context.audioWorklet.addModule("./resources/fm-synthesizer.js");
        return context;
    }
    throw new Error("AudioWorklet support is missing.");
}

// Initialization.

let synthesizer = null;
createAudioContext()
    .then((context) => {
        synthesizer = new AudioWorkletNode(context, "fm-synthesizer");
        synthesizer.connect(context.destination);
        bindCommands();
    })
    .catch((error) => {
        window.alert(error);
    });
