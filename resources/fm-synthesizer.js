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
    /**
     *
     * @param {number} index an index for arrays
     * @param {Object} voice voice parameters shared among operators
     */
    constructor(index, voice)
    {
        this._index = index;
        this._voice = voice;
        this._frequencyRatio = 1.0;
        this._amplitude = 1.0;

        this._output = 0;
        this._phase = 0;
        this._started = false;
        // TODO: make a real envelope generator.
        this._envelope = 0;
    }

    /**
     * Index given to the constructor.
     */
    get index()
    {
        return this._index;
    }

    get output()
    {
        return this._output;
    }

    advance(modulation)
    {
        if (modulation == null) {
            modulation = 0;
        }
        this._output = this._amplitude * this._envelope
            * Math.sin(2 * Math.PI * (this._phase + 4 * modulation));
        if (Number.isNaN(this._output)) {
            if (!this._once) {
                this._once = true;
                console.debug("NaN in advance");
                console.debug("modulation = %f", modulation);
                console.debug("phase = %f", this._phase);
                console.debug("amplitude = %f", this._amplitude);
                console.debug("envelope = %f", this._envelope);
                console.debug("phaseIncrement = %f", this._voice.phaseIncrement);
            }
            this._output = 0;
        }
        this._phase += this._frequencyRatio * this._voice.phaseIncrement;
        this._phase -= Math.floor(this._phase);
    }

    start()
    {
        this._started = true;
        this._envelope = 1.0;
    }

    stop()
    {
        this._started = false;
        this._envelope = 0;
    }
}

class FMSynthesizer extends AudioWorkletProcessor
{
    constructor(options)
    {
        super(options);
        this._voice = {
            key: A3_KEY,
            phaseIncrement: 440 / sampleRate,
        };
        this._operators = [0, 1, 2, 3]
            .map((index) => new FMOperator(index, this._voice));

        this._connection = [
            [0, 0, 0, 0],
            [1, 0, 0, 0],
            [0, 0, 0, 0],
            [0, 0, 1, 0],
        ];
        this._mix = [0, 0, 0, 1];

        // Gets note-ons/offs as messages.
        this.port.addEventListener("message", (event) => {
            console.debug("data = %o", event.data);
            this.handleMessage(event.data);
        });
        this.port.start();
    }

    handleMessage(message)
    {
        if ("noteOn" in message) {
            this._voice.key = message.noteOn.key;
            this._voice.phaseIncrement = 440 / sampleRate
                * Math.pow(2, (message.noteOn.key - A3_KEY) / 12);
            this._operators
                .forEach((o) => {
                    o.start();
                });
        }
        if ("noteOff" in message) {
            if (this._voice.key == message.noteOff.key) {
                this._operators
                    .forEach((o) => {
                        o.stop();
                    });
            }
        }
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
                        index += this._connection[i][j] * this._operators[j].output;
                    }
                    this._operators[i].advance(index);
                }

                let output = 0.125 * this._operators
                    .reduce((x, o) => x + this._mix[o.index] * o.output, 0);
                if (Number.isNaN(output)) {
                    output = 0; // Temporary safeguard.
                }
                for (let i = 0; i < outputs.length; i++) {
                    for (let j = 0; j < outputs[i].length; j++) {
                        outputs[i][j][k] = output;
                    }
                }
            }
        }
        return true;
    }
}

registerProcessor("fm-synthesizer", FMSynthesizer);
