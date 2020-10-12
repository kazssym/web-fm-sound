// fm-synthesizer.js
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

/* global sampleRate */

/**
 * Module script for the audio worklet processors.
 * This file must be imported by an
 * {@link https://developer.mozilla.org/en-US/docs/Web/API/AudioWorklet AudioWorklet}
 * object.
 *
 * @module fm-synthesizer.js
 */

// This file is a module script and shall be in strict mode by default.

const A3_KEY = 69;

class FMOperator
{
    constructor(voice)
    {
        this._voice = voice;
        this._frequencyRatio = 1.0;
        this._amplitude = 1.0;

        this._output = 0;
        this._phase = 0;
        this._on = false;
        // TODO: make a real envelope generator.
        this._envelope = 0;
    }

    get output()
    {
        return this._output;
    }

    advance(index)
    {
        if (index == null) {
            index = 0;
        }
        this._output = this._amplitude * this._envelope
            * Math.sin(2 * Math.PI * (this._phase + 4 * index));
        this._phase += this._frequencyRatio * this._voice.phaseIncrement;
        this._phase -= Math.floor(this._phase);
    }

    on()
    {
        this._on = true;
        this._envelope = 1.0;
    }

    off()
    {
        this._on = false;
        this._envelope = 0;
    }
}

class FMSynthesizer extends AudioWorkletProcessor
{
    constructor(options)
    {
        super(options);
        this._voice = {
            phaseIncrement: 440 / sampleRate,
        };
        this._operators = [0, 1, 2, 3].map(() => new FMOperator(this._voice));
        this._connections = [
            [0, 0, 0, 0],
            [1, 0, 0, 0],
            [0, 0, 0, 0],
            [0, 0, 1, 0],
        ];

        // Gets note-ons/offs as messages.
        this.port.addEventListener("message", (event) => {
            console.debug("data = %o", event.data);
            if ("noteOn" in event.data) {
                console.debug("received a note-on");
            }
            if ("noteOff" in event.data) {
                console.debug("received a note-off");
            }
        });
        this.port.start();
    }

    /**
     * Processes audio samples.
     *
     * @param {Float32Array[][]} _inputs input buffers
     * @param {Float32Array[][]} outputs output buffers
     * @return {boolean}
     */
    process(_inputs, outputs)
    {
        if (outputs.length >= 1) {
            for (let k = 0; k < outputs[0][0].length; ++k) {
                for (let i = 0; i < 4; i++) {
                    let index = 0;
                    for (let j = 0; j < 4; j++) {
                        index += this._connections[i][j] * this._operators[j].output;
                    }
                    this._operators[i].advance(index);
                }
                for (let i = 0; i < outputs.length; i++) {
                    for (let j = 0; j < outputs[i].length; j++) {
                        outputs[i][j][k] = 0.125 * this._operators[3].output;
                    }
                }
            }
        }
        return true;
    }
}

registerProcessor("fm-synthesizer", FMSynthesizer);
