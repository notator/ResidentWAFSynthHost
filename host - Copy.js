/*
*  copyright 2015 James Ingram
*  https://james-ingram-act-two.de/
*
*  Code licensed under MIT
*
*  This file contains the implementation of the WebMIDISynthHost's GUI. 
*  The WebMIDISynthHost can host one or more WebMIDISynths and use one
*  or more SoundFonts.
*/

/*global WebMIDI, window,  document, performance */

WebMIDI.namespace('WebMIDI.host');

WebMIDI.host = (function(document)
{
	"use strict";

    var
        synth = new WebMIDI.residentWAFSynth.ResidentWAFSynth(),
        inputDevice = null,
        commandInputElems = [], // used by AllControllersOff control
        controlInputElems = [], // used by AllControllersOff control

        getElem = function(elemID)
        {
            return document.getElementById(elemID);
        },

        handleInputMessage = function(e)
        {
            function getMsgString(data)
            {
                let str;

                switch(data.length)
                {
                    case 1:
                        str = "data[0]=" + data[0].toString(10) + " (0x" + data[0].toString(16) + ")";
                        break;
                    case 2:
                        str = "data[0]=" + data[0].toString(10) + " (0x" + data[0].toString(16) + ")" +
                              " data[1]=" + data[1].toString(10) + " (0x" + data[1].toString(16) + ")";
                        break;
                    case 3:
                        str = "data[0]=" + data[0].toString(10) + " (0x" + data[0].toString(16) + ")" +
                              " data[1]=" + data[1].toString(10) + " (0x" + data[1].toString(16) + ")" +
                              " data[2]=" + data[2].toString(10) + " (0x" + data[2].toString(16) + ")";
                        break;
                    default:
                        str = "Strange message (too long).";
                        break;
                }

                return str;
            }

            var data = e.data,
                d0, d1, d2;
            try
            {
                console.log(getMsgString(data));
                synth.send(data, performance.now());                
            }
            catch(msg)
            {
                console.warn("Synth threw an exception:\n" + msg + getMsgString(data));
            }
        },

        setInputDeviceEventListener = function(inputDeviceSelect)
        {
            if(inputDevice !== null)
            {
                inputDevice.removeEventListener("midimessage", handleInputMessage, false);
                inputDevice.close();
            }

            inputDevice = inputDeviceSelect.options[inputDeviceSelect.selectedIndex].inputDevice;
            if(inputDevice)
            {
                inputDevice.addEventListener("midimessage", handleInputMessage, false);
                inputDevice.open();
            }
            else
            {
                alert("Can't open input device.");
                inputDeviceSelect.selectedIndex = 0;
            }
        },

        onInputDeviceSelectChanged = function()
        {
            let ids = getElem("inputDeviceSelect");

            if(ids.selectedIndex > 0)
            {
                setInputDeviceEventListener(ids);
            }
            else
            {
                inputDevice = null;
            }
        },

		openInNewTab = function(url)
		{
			var win = window.open(url, '_blank');
			win.focus();
		},

		gitHubButtonClick = function()
		{
			var url = "https://github.com/notator/ResidentWAFSynthHost";
			openInNewTab(url);
		},

		synthWebsiteButtonClick = function()
		{
			openInNewTab(synth.url);
		},

		webAudioFontWebsiteButtonClick = function()
		{
            let webAudioFontSelect = getElem("webAudioFontSelect"),
                selectedOption = webAudioFontSelect[webAudioFontSelect.selectedIndex];

			openInNewTab(selectedOption.url);
		},

		onChannelSelectChanged = function()
		{
			let sendAgainButtons = document.getElementsByClassName("sendAgainButton");
			for(var i = 0; i < sendAgainButtons.length; i++)
			{
				sendAgainButtons[i].click();
			}
		},

		// called by onSoundFontSelectChanged with Sf2 fonts,and by "send again" button.
		onPresetSelectChanged = function()
		{
			var CMD = WebMIDI.constants.COMMAND,
				CTL = WebMIDI.constants.CONTROL,
				channelSelect = getElem("channelSelect"),
				presetSelect = getElem("presetSelect"),
				channel = channelSelect.selectedIndex,
				selectedOption = presetSelect.options[presetSelect.selectedIndex],
				bankIndex, presetIndex;


			if(selectedOption.preset !== undefined) // residentWAFSynth
			{
				presetIndex = selectedOption.preset.presetIndex;
				bankIndex = selectedOption.preset.bankIndex;
			}
			else  // residentSf2Synth
			{
				presetIndex = selectedOption.presetIndex;
				bankIndex = selectedOption.bankIndex;
			}

			let status = CMD.CONTROL_CHANGE + channel;
			let data1 = CTL.BANK;
			let message = new Uint8Array([status, data1, bankIndex]);
			synth.send(message, performance.now());

			status = CMD.PRESET + channel;
			message = new Uint8Array([status, presetIndex]);
			synth.send(message, performance.now());
		},

		setOptions = function(select, options)
		{
			var i;

			for(i = select.options.length - 1; i >= 0; --i)
			{
				select.remove(i);
			}

			for(i = 0; i < options.length; ++i)
			{
				select.add(options[i]);
			}

			select.selectedIndex = 0;
		},

		sendCommand = function(commandIndex, data1, data2)
		{
			var CMD = WebMIDI.constants.COMMAND,
				channelSelect = getElem("channelSelect"),
				channelIndex = parseInt(channelSelect[channelSelect.selectedIndex].value, 10),
				status = commandIndex + channelIndex,
				message;

			switch(commandIndex)
			{
				case CMD.NOTE_ON:
				case CMD.NOTE_OFF:
				case CMD.AFTERTOUCH:
				case CMD.CONTROL_CHANGE:
					message = new Uint8Array([status, data1, data2]); // data1 can be RegisteredParameter or DataEntry controls
					break;
				case CMD.PRESET:
				case CMD.CHANNEL_PRESSURE:
					message = new Uint8Array([status, data1]);
					break;
				case CMD.PITCHWHEEL:
					// This host uses the same 7-bit MSB (0..127) for data1 and data2.
					// Doing this means that the available pitchWheel values are equally spaced
					// and span the complete pitchWheel deviation range.
					message = new Uint8Array([status, data1, data1]);
					break;
				default:
					console.warn("Error: Not a command, or attempt to set the value of a command that has no value.");
			}
			synth.send(message, performance.now());
		},

		setCommandsAndControlsDivs = function()
		{
			var CMD = WebMIDI.constants.COMMAND,
				commandsAndControlsDiv = getElem("commandsAndControlsDiv"),
				controlsTable = getElem("controlsTable");

            function empty(table)
            {
                for(let i = table.childNodes.length - 1; i >= 0; --i)
                {
                    table.removeChild(table.childNodes[i]);
                }
            }

			// sends aftertouch to the notes currently set in the notes controls
			function sendAftertouch(pressure)
			{
				var
					singleNoteIndex = getElem("noteDiv1IndexInput").valueAsNumber,
					note1Checkbox = getElem("sendNote1Checkbox"),
					note1Index = getElem("notesDiv2IndexInput1").valueAsNumber,
					note2Checkbox = getElem("sendNote2Checkbox"),
					note2Index = getElem("notesDiv2IndexInput2").valueAsNumber;

				if(getElem("notesDiv2").display === "none")
				{
					sendCommand(CMD.AFTERTOUCH, singleNoteIndex, pressure);
				}
				else
				{
					if(note1Checkbox.checked)
					{
						sendCommand(CMD.AFTERTOUCH, note1Index, pressure);
					}
					if(note2Checkbox.checked)
					{
						sendCommand(CMD.AFTERTOUCH, note2Index, pressure);
					}
				}
			}

			function sendLongControl(controlIndex, value)
			{
				sendCommand(CMD.CONTROL_CHANGE, controlIndex, value);
			}

			function sendShortControl(controlIndex)
			{
				var
					presetSelect = getElem("presetSelect"),
					commands = synth.commands;

				function resetHostGUI()
				{
					var i, inputID, numberInputElem;

					if(presetSelect !== null)
					{
						presetSelect.selectedIndex = 0;
					}

					for(i = 0; i < commandInputElems.length; ++i)
                    {
                        let inputControl = commandInputElems[i];
                        inputControl.value = inputControl.defaultValue;
					}

					for(i = 0; i < controlInputElems.length; ++i)
                    {
                        let inputControl = controlInputElems[i];
                        inputControl.value = inputControl.defaultValue;
					}
				}

				if(controlIndex === WebMIDI.constants.CONTROL.ALL_CONTROLLERS_OFF)
				{
					resetHostGUI();

					let commandDefaultValue = WebMIDI.constants.commandDefaultValue;

					if(commands.findIndex(cmd => cmd === CMD.PRESET) >= 0)
					{
						if(presetSelect !== null)
						{
							sendCommand(CMD.PRESET, presetSelect[0].presetIndex);
						}
						else
						{
							sendCommand(CMD.PRESET, commandDefaultValue(CMD.PRESET));
						}
					}

					if(commands.findIndex(cmd => cmd === CMD.CHANNEL_PRESSURE) >= 0)
					{
						sendCommand(CMD.CHANNEL_PRESSURE, commandDefaultValue(CMD.CHANNEL_PRESSURE));
					}
					if(commands.findIndex(cmd => cmd === CMD.PITCHWHEEL) >= 0)
					{
						sendCommand(CMD.PITCHWHEEL, commandDefaultValue(CMD.PITCHWHEEL));
					}
					if(commands.findIndex(cmd => cmd === CMD.AFTERTOUCH) >= 0)
					{
						sendAftertouch(commandDefaultValue(CMD.AFTERTOUCH));
					}
				}

				sendCommand(CMD.CONTROL_CHANGE, controlIndex);
			}

			// Returns true if the synth implements one or more of the following commands:
			// PRESET, CHANNEL_PRESSURE, PITCHWHEEL, AFTERTOUCH.
			// These are the only commands to be displayed in the Commands Div.
			// None of these commands MUST be implemented, so hasCommandsDiv() may return false. 
			// Other commands:
			// If CONTROL_CHANGE is implemented, the Controls Div will be displayed.
			// NOTE_ON MUST be implemented, otherwise the host can't play anything.
			// The Notes Div is therefore always displayed.
			// Whether the synth implements NOTE_OFF or not only needs to be determined inside the sendNoteOff function.
			function hasCommands(commands)
			{
				var i, rval = false;
				if(commands !== undefined)
				{
					for(i = 0; i < commands.length; ++i)
					{
						if(commands[i] === CMD.PRESET
							|| commands[i] === CMD.CHANNEL_PRESSURE
							|| commands[i] === CMD.PITCHWHEEL
							|| commands[i] === CMD.AFTERTOUCH)
						{
							rval = true;
							break;
						}
					}
				}

				return rval;
			}

			function appendPresetSelect(presetSelectCell, presetOptionsArray)
			{
				var tr = document.createElement("tr"),
					td, presetSelect, input;

				presetSelect = document.createElement("select");
				presetSelect.id = "presetSelect";
				presetSelect.className = "presetSelect";
				setOptions(presetSelect, presetOptionsArray);
				presetSelect.onchange = onPresetSelectChanged;
                presetSelectCell.appendChild(presetSelect);

				input = document.createElement("input");
				input.type = "button";
				input.className = "sendAgainButton";
				input.value = "send again";
				input.onclick = onPresetSelectChanged;
                presetSelectCell.appendChild(input);
            }

            // called by both commands and CCs
            function setOtherInputControl(currentTarget, value)
            {
                if(currentTarget.type === "range")
                {
                    let idComponents = currentTarget.id.split("SliderInput"),
                        numberInputID = idComponents[0] + "NumberInput" + idComponents[1],
                        numberInputElem = getElem(numberInputID);

                    numberInputElem.value = value;
                }
                else if(currentTarget.type === "number")
                {
                    let idComponents = currentTarget.id.split("NumberInput"),
                        sliderInputID = idComponents[0] + "SliderInput" + idComponents[1],
                        sliderInputElem = getElem(sliderInputID);

                    sliderInputElem.value = value;
                }
            }

			function appendCommandRows(table, synthCommands)
			{
				function appendCommandRow(table, command, i)
				{
					var tr;

					function getCommandRow(command, i)
					{
						var
							tr = document.createElement("tr"),
                            td, input, button;

                        function doCommand(command, value)
                        {
                            if(command === CMD.AFTERTOUCH)
                            {
                                sendAftertouch(value);
                            }
                            else // can only be CHANNEL_PRESSURE or PITCHWHEEL
                            {
                                sendCommand(command, value);
                            }
                        }

						function onCommandInputChanged(event)
						{
                            var currentTarget = event.currentTarget,
                                value = currentTarget.valueAsNumber,
                                command = currentTarget.command;

                            doCommand(command, value);
                            setOtherInputControl(currentTarget, value);
						}

						function onSendCommandAgainButtonClick(event)
						{
							var inputID = event.currentTarget.inputID,
                                numberInput = getElem(inputID),
                                value = numberInput.valueAsNumber,
                                command = numberInput.command;

                            doCommand(command, value);
						}

						td = document.createElement("td");						
						td.className = "left";
                        td.innerHTML = WebMIDI.constants.commandName(command);
                        tr.appendChild(td);

                        td = document.createElement("td");
                        tr.appendChild(td);                       

                        // slider input
                        // <input type="range" class="midiSlider" id="myRange" min="0" max="127" value="64" />
                        input = document.createElement("input");
                        input.type = "range";
                        input.name = "value";
                        input.id = "commandSliderInput" + i.toString(10);
                        input.min = 0;
                        input.max = 127;
                        input.value = WebMIDI.constants.commandDefaultValue(command);
                        input.command = command;
                        input.defaultValue = input.value;
                        input.className = "midiSlider";
                        input.onchange = onCommandInputChanged;
                        td.appendChild(input);
                        commandInputElems.push(input);

                        // number input
						input = document.createElement("input");
						input.type = "number";
						input.name = "value";
						input.id = "commandNumberInput" + i.toString(10);
						input.min = 0;
						input.max = 127;
						input.value = WebMIDI.constants.commandDefaultValue(command);
						input.command = command;
						input.defaultValue = input.value;
						input.className = "number";
						input.onchange = onCommandInputChanged;
                        td.appendChild(input);
                        commandInputElems.push(input);

						button = document.createElement("input");
						button.type = "button";
						button.className = "sendAgainButton";
						button.value = "send again";
						button.inputID = input.id;
                        button.onclick = onSendCommandAgainButtonClick;
                        td.appendChild(button);

                        td = document.createElement("td");
                        td.className = "left";
                        td.innerHTML = "Cmd " + command;
                        tr.appendChild(td);						

						return tr;
					}

					// These are the only commands that need handling here.
					switch(command)
					{
						case CMD.PRESET:
							tr = getCommandRow(CMD.PRESET, i);
							break;
						case CMD.CHANNEL_PRESSURE:
							tr = getCommandRow(CMD.CHANNEL_PRESSURE, i);
							break;
						case CMD.PITCHWHEEL:
							tr = getCommandRow(CMD.PITCHWHEEL, i);
							break;
						case CMD.AFTERTOUCH:
							tr = getCommandRow(CMD.AFTERTOUCH, i);
							break;
						default:
							break;
					}
					if(tr !== undefined)
					{
						table.appendChild(tr);
					}
				}

				let webAudioFontSelect = getElem("webAudioFontSelect"),
					command, row = 0;

				for(let i = 0; i < synthCommands.length; ++i)
				{
					command = synthCommands[i];
					if(command === CMD.PRESET)
                    {
                        console.assert(synth.name === "ResidentWAFSynth", "Error: This app only uses the residentWAFSynth.");
                        let presetSelectCell = getElem("presetSelectCell")
                        appendPresetSelect(presetSelectCell, webAudioFontSelect[webAudioFontSelect.selectedIndex].presetOptionsArray);
						onWebAudioFontSelectChanged();
					}
					else if(command === CMD.CHANNEL_PRESSURE || command === CMD.PITCHWHEEL || command === CMD.AFTERTOUCH)
					{
						appendCommandRow(table, synthCommands[i], row++);
					}
				}
			}

			function appendControlRows(table, controls)
			{
				// returns an array of tr elements
				function getControlRows(ccIndices)
				{
					// 3-byte controls
					function setLongControlRow(tr, name, defaultValue, ccIndex, i)
					{
						var td, input, button;

						function onControlInputChanged(event)
						{
                            let currentTarget = event.currentTarget,                                
                                ccIndex = currentTarget.ccIndex,
                                value = currentTarget.valueAsNumber;

                            sendLongControl(ccIndex, value);
                            setOtherInputControl(currentTarget, value);
						}

						function onSendControlAgainButtonClick(event)
						{
							var numberInputElem = event.currentTarget.numberInputElem,
                                ccIndex = numberInputElem.ccIndex,
                                value = numberInputElem.valueAsNumber;

                            sendLongControl(ccIndex, value);
						}

						td = document.createElement("td");
						tr.appendChild(td);
						td.className = "left";
						td.innerHTML = name;

						td = document.createElement("td");
                        tr.appendChild(td);

                        // slider input
                        // <input type="range" class="midiSlider" id="myRange" min="0" max="127" value="64" />
                        input = document.createElement("input");
                        input.type = "range";
                        input.id = "controlSliderInput" + i.toString(10);
                        input.value = defaultValue;
                        input.defaultValue = defaultValue;
                        input.ccIndex = ccIndex;
                        input.className = "midiSlider";
                        input.min = 0;
                        input.max = 127;
                        input.onchange = onControlInputChanged;
                        td.appendChild(input);
                        controlInputElems.push(input);

                        // number input
						input = document.createElement("input");
						input.type = "number";
						input.id = "controlNumberInput" + i.toString(10);
						input.value = defaultValue;
                        input.defaultValue = defaultValue;
                        input.ccIndex = ccIndex;
						input.className = "number";
                        input.min = 0;
                        input.max = 127;
						input.onchange = onControlInputChanged;
                        td.appendChild(input);
                        controlInputElems.push(input);

						button = document.createElement("input");
						button.type = "button";
						button.className = "sendAgainButton";
						button.value = "send again";
						button.numberInputElem = input;
						button.onclick = onSendControlAgainButtonClick;
						td.appendChild(button);

						td = document.createElement("td");
						tr.appendChild(td);
                        td.innerHTML = "CC " + ccIndex.toString();

						return tr;
                    }

					// 2-byte uControls
					function setShortControlRow(tr, name, ccIndex)
					{
						var
							button,
							td = document.createElement("td");

						function onSendShortControlButtonClick(event)
						{
                            sendShortControl(event.currentTarget.ccIndex);
						}

						tr.appendChild(td);
						td.className = "left";
						td.innerHTML = name;

						td = document.createElement("td");
						tr.appendChild(td);
						button = document.createElement("input");
						button.type = "button";
						button.className = "sendButton";
						button.value = "send";
                        button.ccIndex = ccIndex;
						button.onclick = onSendShortControlButtonClick;
						td.appendChild(button);

                        let node = document.createTextNode("CC " + ccIndex.toString());
                        td.appendChild(node);
                    }

                    let rval = [];
					for(let i = 0; i < ccIndices.length; ++i)
					{
                        let c = WebMIDI.constants,
                            ccIndex = ccIndices[i],                            
                            name = c.controlName(ccIndex),
                            defaultValue = c.controlDefaultValue(ccIndex),
                            tr = document.createElement("tr");

                        rval.push(tr);

						if(defaultValue === undefined)
                        {
                            if(ccIndex === c.CONTROL.ALL_CONTROLLERS_OFF)
                            {
                                name = name + " (set defaults)";
                            }
                            setShortControlRow(tr, name, ccIndex);
						}
						else
						{
                            if(!(ccIndex === c.CONTROL.BANK || ccIndex === c.CONTROL.REGISTERED_PARAMETER_COARSE))
                            {
                                if(ccIndex === c.CONTROL.DATA_ENTRY_COARSE)
                                {
                                    name = name + " (pitchwheel range)";
                                }
                                setLongControlRow(tr, name, defaultValue, ccIndex, i);
							}
						}
					}

					return rval;
                }

                let controlRows = getControlRows(controls);

				for(let i = 0; i < controlRows.length; ++i)
				{
					let tr = controlRows[i];
					table.appendChild(tr);
				}
			}

			commandInputElems.length = 0;
			controlInputElems.length = 0;

            empty(controlsTable);

            commandsAndControlsDiv.style.display = "block";
            controlsTable.style.display = "table";

			appendCommandRows(controlsTable, synth.commands);

			appendControlRows(controlsTable, synth.controls);

			sendShortControl(WebMIDI.constants.CONTROL.ALL_CONTROLLERS_OFF);
		},

		// exported
		onWebAudioFontSelectChanged = function()
		{
			let webAudioFontSelect = getElem("webAudioFontSelect"),
				presetSelect = getElem("presetSelect"),
				selectedSoundFontOption = webAudioFontSelect[webAudioFontSelect.selectedIndex],
				soundFont = selectedSoundFontOption.soundFont,
				presetOptionsArray = selectedSoundFontOption.presetOptionsArray;

			synth.setSoundFont(soundFont);

			setOptions(presetSelect, presetOptionsArray);
			presetSelect.selectedIndex = 0;
			onPresetSelectChanged();
		},

		// exported.
		onContinueAtStartClicked = function()
		{
			function setWebAudioFontTableDisplay(synth)
			{
				function getWebAudioFontOptions(webAudioFonts)
				{
					let options = [];

					for(var fontIndex = 0; fontIndex < webAudioFonts.length; fontIndex++)
					{
						let option = new Option("webAudioFontOption"),
							webAudioFont = webAudioFonts[fontIndex];

						let presetOptionsArray = [];
						for(let bankIndex = 0; bankIndex < webAudioFont.banks.length; bankIndex++)
						{
							let bank = webAudioFont.banks[bankIndex];
							for(var j = 0; j < bank.length; j++)
							{
								let preset = bank[j],
									presetOption = new Option("presetOption");

								presetOption.innerHTML = preset.name;
								presetOption.preset = preset;

								presetOptionsArray.push(presetOption);
							}
						}

						option.innerHTML = webAudioFont.name;
						option.soundFont = webAudioFont;
						option.presetOptionsArray = presetOptionsArray; // used to set the presetSelect
						option.url = "https://github.com/surikov/webaudiofont";

						options.push(option);
					}

					return options;
				}

                let
                    webAudioFontDiv = getElem("webAudioFontDiv"),
                    webAudioFontSelect = getElem("webAudioFontSelect");

                console.assert(synth.name === "ResidentWAFSynth", "Error: this app only uses the ResidentWAFSynth")

                let options = getWebAudioFontOptions(synth.webAudioFonts);

				setOptions(webAudioFontSelect, options);

				webAudioFontSelect.selectedIndex = 0;

				webAudioFontDiv.style.display = "block";
			}

            synth.open();

            setInputDeviceEventListener(getElem("inputDeviceSelect"));

            getElem("continueAtStartButtonDiv").style.display = "none";

			setWebAudioFontTableDisplay(synth);

			setCommandsAndControlsDivs();

			getElem("noteDiv1").style.display = "none";
			getElem("notesDiv2").style.display = "block";
		},

		noteCheckboxClicked = function()
		{
			var
				note1Checkbox = getElem("sendNote1Checkbox"),
				note2Checkbox = getElem("sendNote2Checkbox");

			if((!note1Checkbox.checked) && (!note2Checkbox.checked))
			{
				note2Checkbox.checked = true;
			}
		},

		sendNoteOn = function(noteIndex, noteVelocity)
		{
			sendCommand(WebMIDI.constants.COMMAND.NOTE_ON, noteIndex, noteVelocity);
		},

		sendNoteOff = function(noteIndex, noteVelocity)
		{
            var
                NOTE_ON = WebMIDI.constants.COMMAND.NOTE_ON,
                NOTE_OFF = WebMIDI.constants.COMMAND.NOTE_OFF;

			if(synth.commands.indexOf(NOTE_OFF) >= 0)
			{
				sendCommand(NOTE_OFF, noteIndex, noteVelocity);
			}
			else
			{
				sendCommand(NOTE_ON, noteIndex, 0);
			}
		},

		doNoteOn = function()
		{
			var
				noteIndex = getElem("noteDiv1IndexInput").valueAsNumber,
				noteVelocity = getElem("noteDiv1VelocityInput").valueAsNumber,
				holdCheckbox1 = getElem("holdCheckbox1"),
				sendButton1 = getElem("sendButton1");

			if(holdCheckbox1.checked === true)
			{
				sendButton1.disabled = true;
			}

			sendNoteOn(noteIndex, noteVelocity);
		},

		doNoteOff = function()
		{
			var
				noteIndex = getElem("noteDiv1IndexInput").valueAsNumber,
				noteVelocity = getElem("noteDiv1VelocityInput").valueAsNumber;

			sendNoteOff(noteIndex, noteVelocity);
		},

		doNotesOn = function()
		{
			var
				note1Checkbox = getElem("sendNote1Checkbox"),
				note1Index = getElem("notesDiv2IndexInput1").valueAsNumber,
				note1Velocity = getElem("notesDiv2VelocityInput1").valueAsNumber,
				note2Checkbox = getElem("sendNote2Checkbox"),
				note2Index = getElem("notesDiv2IndexInput2").valueAsNumber,
				note2Velocity = getElem("notesDiv2VelocityInput2").valueAsNumber,
				holdCheckbox2 = getElem("holdCheckbox2"),
				sendButton2 = getElem("sendButton2");

			if(holdCheckbox2.checked === true)
			{
				sendButton2.disabled = true;
			}

			if(note1Checkbox.checked)
			{
				sendNoteOn(note1Index, note1Velocity);
			}
			if(note2Checkbox.checked)
			{
				sendNoteOn(note2Index, note2Velocity);
			}
		},

		doNotesOff = function()
		{
			var
				note1Checkbox = getElem("sendNote1Checkbox"),
				note1Index = getElem("notesDiv2IndexInput1").valueAsNumber,
				note1Velocity = getElem("notesDiv2VelocityInput1").valueAsNumber,
				note2Checkbox = getElem("sendNote2Checkbox"),
				note2Index = getElem("notesDiv2IndexInput2").valueAsNumber,
				note2Velocity = getElem("notesDiv2VelocityInput2").valueAsNumber;

			if(note1Checkbox.checked)
			{
				sendNoteOff(note1Index, note1Velocity);
			}
			if(note2Checkbox.checked)
			{
				sendNoteOff(note2Index, note2Velocity);
			}
		},

		holdCheckboxClicked = function()
		{
			var
				holdCheckbox1 = getElem("holdCheckbox1"),
				holdCheckbox2 = getElem("holdCheckbox2");

			if(getElem("notesDiv2").style.display === "none")
			{
				if(holdCheckbox1.checked === false)
				{
					doNoteOff();
					getElem("sendButton1").disabled = false;
				}
			}
			else
			{
				if(holdCheckbox2.checked === false)
				{
					doNotesOff();
					getElem("sendButton2").disabled = false;
				}
			}
		},

		init = function()
		{
            function setupInputDevice()
            {
                function setInputDeviceSelect(midiAccess)
                {
                    let iDevSelect = getElem("inputDeviceSelect"),
                        option;

                    iDevSelect.options.length = 0; // important when called by midiAccess.onstatechange 

                    option = document.createElement("option");
                    if(midiAccess !== null)
                    {
                        option.text = "choose a MIDI input device";
                        iDevSelect.add(option, null);
                        midiAccess.inputs.forEach(function(port)
                        {
                            //console.log('input id:', port.id, ' input name:', port.name);
                            option = document.createElement("option");
                            option.inputDevice = port;
                            option.text = port.name;
                            iDevSelect.add(option, null);
                        });
                        iDevSelect.disabled = false;
                    }
                    else
                    {
                        option.text = "There are no MIDI input devices available";
                        iDevSelect.add(option, null);
                        iDevSelect.disabled = true;
                    }

                    for(var i = iDevSelect.options.length - 1; i >= 0; --i)
                    {
                        iDevSelect.selectedIndex = i;
                        if(iDevSelect[iDevSelect.selectedIndex].text === "E-MU Xboard49")
                        {
                            inputDevice = iDevSelect[iDevSelect.selectedIndex].inputDevice;
                            break;
                        }
                    }
                }

                function onSuccessCallback(midiAccess)
                {
                    // Add the midiAccess.inputs to the inputDeviceSelect.
                    setInputDeviceSelect(midiAccess);
                }

                // This function will be called either
                // if the browser does not support the Web MIDI API,
                // or if the user refuses permission to use his hardware MIDI devices.
                function onErrorCallback()
                {
                    alert("Error getting midiAccess for the inputDevice.");
                };

                navigator.requestMIDIAccess().then(onSuccessCallback, onErrorCallback);
            }

            function setInitialDivsDisplay()
            {
                getElem("loadingMsgDiv").style.display = "none";
                getElem("continueAtStartButtonDiv").style.display = "block";

                getElem("webAudioFontDiv").style.display = "none";
                getElem("commandsAndControlsDiv").style.display = "none";
                getElem("noteDiv1").style.display = "none";
                getElem("notesDiv2").style.display = "none";
            }

            setupInputDevice();
			setInitialDivsDisplay();
		},

		publicAPI =
		{
            gitHubButtonClick: gitHubButtonClick,

            onInputDeviceSelectChanged: onInputDeviceSelectChanged,

			onContinueAtStartClicked: onContinueAtStartClicked,

			synthWebsiteButtonClick: synthWebsiteButtonClick,
			soundFontWebsiteButtonClick: webAudioFontWebsiteButtonClick,

			onChannelSelectChanged: onChannelSelectChanged,
			onWebAudioFontSelectChanged: onWebAudioFontSelectChanged,
			onPresetSelectChanged: onPresetSelectChanged,

			noteCheckboxClicked: noteCheckboxClicked,
			holdCheckboxClicked: holdCheckboxClicked,

			doNoteOn: doNoteOn,
			doNoteOff: doNoteOff,

			doNotesOn: doNotesOn,
			doNotesOff: doNotesOff
		};
	// end var

	init();

	return publicAPI;

}(document));