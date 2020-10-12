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

function sendNoteOn()
{
    if (synthesizer.context.state == "suspended") {
        synthesizer.context.resume();
    }

    console.debug("note on");
    synthesizer.port.postMessage({
        noteOn: {
            key: 69,
        }
    });
}

function sendNoteOff()
{
    if (synthesizer.context.state == "suspended") {
        synthesizer.context.resume();
    }

    console.debug("note off");
    synthesizer.port.postMessage({
        noteOff: {
            key: 69,
        }
    });
}

/**
 * Binds UI commands.
 */
function bindCommands()
{
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
        alert(error);
    });
