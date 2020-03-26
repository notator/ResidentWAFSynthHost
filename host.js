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
        commandInputIDs = [], // used by AllControllersOff control
        longInputControlIDs = [], // used by AllControllersOff control

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
				commandsDiv = getElem("commandsDiv"),
				commandsTable = getElem("commandsTable"),
				controlsDiv = getElem("controlsDiv"),
				controlsTable = getElem("controlsTable");

			function emptyTables(commandsTable, controlsTable)
			{
				var i;

				function empty(table)
				{
					for(i = table.childNodes.length - 1; i >= 0; --i)
					{
						table.removeChild(table.childNodes[i]);
					}
				}

				empty(commandsTable);
				empty(controlsTable);
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

					for(i = 0; i < commandInputIDs.length; ++i)
					{
						inputID = commandInputIDs[i];
						numberInputElem = getElem(inputID);
						numberInputElem.value = numberInputElem.defaultValue;
					}

					for(i = 0; i < longInputControlIDs.length; ++i)
					{
						inputID = longInputControlIDs[i];
						numberInputElem = getElem(inputID);
						numberInputElem.value = numberInputElem.uControl.defaultValue;
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
			function hasCommandsDiv(commands)
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

			function appendSoundFontPresetCommandRow(table, presetOptionsArray)
			{
				var tr = document.createElement("tr"),
					td, presetSelect, input;

				table.appendChild(tr);

				td = document.createElement("td");
				tr.appendChild(td);
				td.className = "left";
				td.innerHTML = "preset";

				td = document.createElement("td");
				tr.appendChild(td);
				presetSelect = document.createElement("select");
				presetSelect.id = "presetSelect";
				presetSelect.className = "presetSelect";
				setOptions(presetSelect, presetOptionsArray);
				presetSelect.onchange = onPresetSelectChanged;
				td.appendChild(presetSelect);

				td = document.createElement("td");
				tr.appendChild(td);
				input = document.createElement("input");
				input.type = "button";
				input.className = "sendAgainButton";
				input.value = "send again";
				input.onclick = onPresetSelectChanged;
				td.appendChild(input);
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

						function sendMessageFromInput(numberInput)
						{
							var value = numberInput.valueAsNumber;

							if(numberInput.command === CMD.AFTERTOUCH)
							{
								sendAftertouch(value);
							}
							else // can only be CHANNEL_PRESSURE or PITCHWHEEL
							{
								sendCommand(numberInput.command, value);
							}
						}

						function onInputChanged(event)
						{
							var numberInput = event.currentTarget;

							sendMessageFromInput(numberInput);
						}

						function onSendAgainButtonClick(event)
						{
							var inputID = event.currentTarget.inputID,
								numberInput = getElem(inputID);

							sendMessageFromInput(numberInput);
						}

						td = document.createElement("td");
						tr.appendChild(td);
						td.className = "left";
						td.innerHTML = WebMIDI.constants.commandName(command);

						td = document.createElement("td");
						tr.appendChild(td);

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
						input.onchange = onInputChanged;
						td.appendChild(input);

						button = document.createElement("input");
						button.type = "button";
						button.className = "sendAgainButton";
						button.value = "send again";
						button.inputID = input.id;
						button.onclick = onSendAgainButtonClick;
						td.appendChild(button);

						commandInputIDs.push(input.id);

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

						appendSoundFontPresetCommandRow(commandsTable, webAudioFontSelect[webAudioFontSelect.selectedIndex].presetOptionsArray);
						onWebAudioFontSelectChanged();

						row++;
					}
					else if(command === CMD.CHANNEL_PRESSURE || command === CMD.PITCHWHEEL || command === CMD.AFTERTOUCH)
					{
						appendCommandRow(table, synthCommands[i], row++);
					}
				}
			}

			function appendControlRows(table, controls)
			{
				var i, tr, controlRows;

				// returns an array of tr elements
				function getControlRows(controls)
				{
					var i, uControls, tr, rval = [], uControl;

					// Returns an array of unique controls.
					// Each unique control has the following attributes:
					//   .name -- the name string (for use in a GUI)
					//   .defaultValue -- a MIDI value in range [0..127]
					//   .ccs -- an array containing the control's possible cc indices.
					function getUniqueControls(nonUniqueControls)
					{
						var controlDefaultValue = WebMIDI.constants.controlDefaultValue,
							controlName = WebMIDI.constants.controlName,
							nuControlName, nuDefaultValue, i, nuControl, uniqueControls = [], uniqueControl,
							registeredParameterCoarseName = controlName(WebMIDI.constants.CONTROL.REGISTERED_PARAMETER_COARSE),
							dataEntryCoarseName = controlName(WebMIDI.constants.CONTROL.DATA_ENTRY_COARSE);

						function newUniqueControl(nuControl)
						{
							var uniqueControl = {};

							uniqueControl.name = controlName(nuControl);
							uniqueControl.ccs = [];
							uniqueControl.ccs.push(nuControl);
							nuDefaultValue = controlDefaultValue(nuControl);
							if(nuDefaultValue !== undefined)
							{
								uniqueControl.defaultValue = nuDefaultValue;
							}
							if(nuControl.nItems !== undefined)
							{
								uniqueControl.nItems = nuControl.nItems;
							}
							return uniqueControl;
						}

						for(i = 0; i < nonUniqueControls.length; ++i)
						{
                            if(synth.name === "CW_MIDISynth")
							{
								let nonUniqueControl = nonUniqueControls[i]; 
								nuControl = nonUniqueControl.index;
								uniqueControl = newUniqueControl(nuControl);
								uniqueControl.name = nonUniqueControl.name;
								uniqueControl.defaultValue = nonUniqueControl.defaultValue;
								uniqueControl.nItems = nonUniqueControl.nItems;
								uniqueControls.push(uniqueControl);
							}
							else
							{
								nuControl = nonUniqueControls[i];
								uniqueControl = uniqueControls.find(ctl => ctl.name === nuControl.name);
								if(uniqueControl === undefined)
								{
									uniqueControl = newUniqueControl(nuControl);
									if(uniqueControl.name !== registeredParameterCoarseName)
									{
										if(uniqueControl.name === dataEntryCoarseName)
										{
											uniqueControl.name = dataEntryCoarseName + " (pitchBendSensitivity)";
										}
										uniqueControl.defaultValue = WebMIDI.constants.controlDefaultValue(nuControl)
										uniqueControls.push(uniqueControl);
									}
								}
								else
								{
									uniqueControl.ccs.push(nuControl);
								}
							}
						}

						return uniqueControls;
					}

					function ccString(ccs)
					{
						var i, rval = "CC ";

						for(i = 0; i < ccs.length; ++i)
						{
							rval += ccs[i].toString(10);
							rval += ", ";
						}
						rval = rval.substring(0, rval.length - 2);

						return rval;
					}

					// 3-byte controls
					function setLongControlRow(tr, uControl, i)
					{
						var td, input, button;

						function sendMessageFromInput(numberInput)
						{
							var
								value = numberInput.valueAsNumber,
								uControl = numberInput.uControl;

							// returns a value in range [0..127] for an index in range [0..nItems-1]
							function valueFromIndex(index, nItems)
							{
								var partitionSize = 127 / nItems;

								return Math.round((partitionSize / 2) + (partitionSize * index));
							}

							if(uControl.nItems !== undefined)
							{
								value = valueFromIndex(value, uControl.nItems);
							}

							sendLongControl(numberInput.uControl.ccs[0], value);
						}

						function onInputChanged(event)
						{
							var numberInput = event.currentTarget;

							sendMessageFromInput(numberInput);
						}

						function onSendAgainButtonClick(event)
						{
							var inputID = event.currentTarget.inputID,
								numberInput = getElem(inputID);

							sendMessageFromInput(numberInput);
						}

						td = document.createElement("td");
						tr.appendChild(td);
						td.className = "left";
						td.innerHTML = uControl.name;

						td = document.createElement("td");
						tr.appendChild(td);

						input = document.createElement("input");
						input.type = "number";
						input.name = "value";
						input.id = "controlNumberInput" + i.toString(10);
						input.value = uControl.defaultValue;
						input.uControl = uControl;
						input.className = "number";
						input.min = 0;
						if(uControl.nItems === undefined)
						{
							input.max = 127;
						}
						else
						{
							input.max = uControl.nItems - 1;
						}
						input.onchange = onInputChanged;
						td.appendChild(input);

						button = document.createElement("input");
						button.type = "button";
						button.className = "sendAgainButton";
						button.value = "send again";
						button.inputID = input.id;
						button.onclick = onSendAgainButtonClick;
						td.appendChild(button);

						td = document.createElement("td");
						tr.appendChild(td);
						td.innerHTML = ccString(uControl.ccs);

						longInputControlIDs.push(input.id);

						return tr;
					}
					// 2-byte uControls
					function setShortControlRow(tr, uControl)
					{
						var
							button,
							td = document.createElement("td");

						function onSendShortControlButtonClick(event)
						{
							var uControl = event.currentTarget.uControl;

							sendShortControl(uControl.ccs[0]);
						}

						tr.appendChild(td);
						td.className = "left";
						td.innerHTML = uControl.name;

						td = document.createElement("td");
						tr.appendChild(td);
						button = document.createElement("input");
						button.type = "button";
						button.className = "sendButton";
						button.value = "send";
						button.uControl = uControl;
						button.onclick = onSendShortControlButtonClick;
						//button.style.marginLeft = "4px";
						//button.style.marginRight = "4px";
						td.appendChild(button);

						td = document.createElement("td");
						tr.appendChild(td);
						td.innerHTML = ccString(uControl.ccs);
					}

					uControls = getUniqueControls(controls);

					for(i = 0; i < uControls.length; ++i)
					{
						uControl = uControls[i];
						tr = document.createElement("tr");
						rval.push(tr);
						if(uControl.defaultValue === undefined)
						{
							setShortControlRow(tr, uControl);
						}
						else
						{
							if(!(uControl.ccs[0] === WebMIDI.constants.CONTROL.BANK && synth.supportsGeneralMIDI))
							{
								setLongControlRow(tr, uControl, i);
							}
						}
					}

					return rval;
				}

				controlRows = getControlRows(controls);
				for(i = 0; i < controlRows.length; ++i)
				{
					tr = controlRows[i];
					table.appendChild(tr);
				}
			}

			commandInputIDs.length = 0;
			longInputControlIDs.length = 0;

			emptyTables(commandsTable, controlsTable);

			if(hasCommandsDiv(synth.commands))
			{
				commandsDiv.style.display = "block";
				commandsTable.style.display = "table";

				appendCommandRows(commandsTable, synth.commands);
			}
			else
			{
				commandsDiv.style.display = "none";
				commandsTable.style.display = "none";
			}

			if(synth.controls !== undefined && synth.controls.length > 0)
			{
				controlsDiv.style.display = "block";
				controlsTable.style.display = "table";

				appendControlRows(controlsTable, synth.controls);
			}
			else
			{
				controlsDiv.style.display = "none";
				controlsTable.style.display = "none";
			}

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

                getElem("inputDeviceSelectDiv").style.display = "block";
                getElem("synthInfoDiv").style.display = "block";
                getElem("continueAtStartButtonDiv").style.display = "block";

                getElem("webAudioFontDiv").style.display = "none";
                getElem("commandsDiv").style.display = "none";
                getElem("controlsDiv").style.display = "none";
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
