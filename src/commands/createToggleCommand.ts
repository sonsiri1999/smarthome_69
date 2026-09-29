import { Curtain } from '../devices/Curtain';
import type { Device } from '../devices/Device';
import { Gate } from '../devices/gate/Gate';
import type { Command } from './Command';
import { GateCommand } from './GateCommand';
import { SetCurtainCommand } from './SetCurtainCommand';
import { TurnOffCommand } from './TurnOffCommand';
import { TurnOnCommand } from './TurnOnCommand';

/** The command a manual on/off button should send for this device. */
export function createToggleCommand(device: Device): Command {
  if (device instanceof Curtain) return new SetCurtainCommand(device, !device.isClosed);
  if (device instanceof Gate) return new GateCommand(device, device.isOn ? 'close' : 'open');
  return device.isOn ? new TurnOffCommand(device) : new TurnOnCommand(device);
}
