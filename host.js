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
		commandInputIDs = [], // used by AllControllersOff control
		longInputControlIDs = [], // used by AllControllersOff control

		getElem = function(elemID)
		{
			return document.getElementById(elemID);
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
			var
				synthSelect = getElem("synthSelect"),
				synth = synthSelect[synthSelect.selectedIndex].synth;

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
				synthSelect = getElem("synthSelect"),
				channelSelect = getElem("channelSelect"),
				presetSelect = getElem("presetSelect"),
				synth = synthSelect.options[synthSelect.selectedIndex].synth,
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
				synthSelect = getElem("synthSelect"),
				synth = synthSelect[synthSelect.selectedIndex].synth,
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
				synthSelect = getElem("synthSelect"),
				synth = synthSelect[synthSelect.selectedIndex].synth,
				commandsDiv = getElem("commandsDiv"),
				commandsTitleDiv = getElem("commandsTitleDiv"),
				commandsTable = getElem("commandsTable"),
				controlsDiv = getElem("controlsDiv"),
				controlsTitleDiv = getElem("controlsTitleDiv"),
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
					synthSelect = getElem("synthSelect"),
					synth = synthSelect[synthSelect.selectedIndex].synth,
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
				commandsTitleDiv.style.display = "block";
				commandsTable.style.display = "table";

				appendCommandRows(commandsTable, synth.commands);
			}
			else
			{
				commandsDiv.style.display = "none";
				commandsTitleDiv.style.display = "none";
				commandsTable.style.display = "none";
			}

			if(synth.controls !== undefined && synth.controls.length > 0)
			{
				controlsDiv.style.display = "block";
				controlsTitleDiv.style.display = "block";
				controlsTable.style.display = "table";

				appendControlRows(controlsTable, synth.controls);
			}
			else
			{
				controlsDiv.style.display = "none";
				controlsTitleDiv.style.display = "none";
				controlsTable.style.display = "none";
			}

			sendShortControl(WebMIDI.constants.CONTROL.ALL_CONTROLLERS_OFF);
		},

		// exported
		onWebAudioFontSelectChanged = function()
		{
			let synthSelect = getElem("synthSelect"),
				webAudioFontSelect = getElem("webAudioFontSelect"),
				presetSelect = getElem("presetSelect"),
				synth = synthSelect[synthSelect.selectedIndex].synth,
				selectedSoundFontOption = webAudioFontSelect[webAudioFontSelect.selectedIndex],
				soundFont = selectedSoundFontOption.soundFont,
				presetOptionsArray = selectedSoundFontOption.presetOptionsArray;

			synth.setSoundFont(soundFont);

			setOptions(presetSelect, presetOptionsArray);
			presetSelect.selectedIndex = 0;
			onPresetSelectChanged();
		},

		// exported. Also used by init()
		onSynthSelectChanged = function()
		{
			var
				synthSelect = getElem("synthSelect"),
				synth = synthSelect[synthSelect.selectedIndex].synth;

			function setMonoPolyDisplay(synth)
			{
				var
					synthInfoDiv = getElem("synthInfoDiv"),
					singleChannelSynthInfo = getElem("singleChannelSynthInfo"),
					multiChannelSynthInfo = getElem("multiChannelSynthInfo");

				if(synth.isMultiChannel)
				{
					singleChannelSynthInfo.style.display = "none";
					multiChannelSynthInfo.style.display = "table-row";
				}
				else
				{
					singleChannelSynthInfo.style.display = "table-row";
					multiChannelSynthInfo.style.display = "none";
				}
				synthInfoDiv.style.display = "block";
			}

			function setSoundFontTableDisplay(synth)
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
					cursorControlDiv = getElem("cursorControlDiv"),
					soundFontDiv = getElem("soundFontDiv"),
					soundFontTable1 = getElem("soundFontTable1"),
					soundFontTypeName = getElem("soundFontType"),
					webAudioFontSelect = getElem("webAudioFontSelect"),
					soundFontTable2 = getElem("soundFontTable2");

				cursorControlDiv.style.cursor = "auto";

                console.assert(synth.name === "ResidentWAFSynth", "Error: this app only uses the ResidentWAFSynth")
				soundFontTypeName.innerHTML = "WebAudioFont: ";

                let options = getWebAudioFontOptions(synth.webAudioFonts);

				setOptions(webAudioFontSelect, options);

				webAudioFontSelect.selectedIndex = 0;
				webAudioFontSelect.style.display = "block";

				soundFontDiv.style.display = "block";
				soundFontTable1.style.display = "block";
				soundFontTable2.style.display = "block";

			}

			synth.open();

			synthSelect.onchange = onSynthSelectChanged; // activated by synthSelectDivButton

			getElem("synthSelectDivButtonDiv").style.display = "none";

			setMonoPolyDisplay(synth);

			setSoundFontTableDisplay(synth);

			setCommandsAndControlsDivs();

			if(synth.isPolyphonic === true)
			{
				getElem("noteDiv1").style.display = "none";
				getElem("notesDiv2").style.display = "block";
			}
			else
			{
				getElem("noteDiv1").style.display = "block";
				getElem("notesDiv2").style.display = "none";
			}
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
				NOTE_OFF = WebMIDI.constants.COMMAND.NOTE_OFF,
				synthSelect = getElem("synthSelect"),
				synth = synthSelect[synthSelect.selectedIndex].synth;

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
			function setInitialDivsDisplay()
			{
				getElem("synthSelectDiv").style.display = "block";
				getElem("synthSelectDivButtonDiv").style.display = "block";
				getElem("synthInfoDiv").style.display = "none";
				getElem("soundFontDiv").style.display = "none";
				getElem("commandsDiv").style.display = "none";
				getElem("controlsDiv").style.display = "none";
				getElem("noteDiv1").style.display = "none";
				getElem("notesDiv2").style.display = "none";
			}

			let	option,
				synthSelect = getElem("synthSelect");

			setInitialDivsDisplay();

			// Do the following for each available synth.
            // The synths appear in this order in the synth selector.
			option = new Option("synthOption");
			option.synth = new WebMIDI.residentWAFSynth.ResidentWAFSynth();
			option.text = option.synth.name;
			synthSelect.add(option);
		},

		publicAPI =
		{
			gitHubButtonClick: gitHubButtonClick,

			onSynthSelectChanged: onSynthSelectChanged,

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
