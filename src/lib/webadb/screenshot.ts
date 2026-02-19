import type {Adb} from '@yume-chan/adb';
import {AdbDaemonWebUsbDevice} from '@yume-chan/adb-daemon-webusb';
import {AdbManager} from './manager';

let _manager: AdbManager | undefined;
let selectedDevice: AdbDaemonWebUsbDevice | undefined;

async function _syncSelectedDevice(): Promise<boolean> {
    const devices = await getAdbManager().getDevices();

    if (!devices.length) {
        selectedDevice = undefined;
        return false;
    }

    // Keep using the previously chosen device if it's still connected.
    if (selectedDevice) {
        const stillConnected = devices.some(
            (device) => device.serial === selectedDevice!.serial,
        );
        if (stillConnected) {
            return true;
        }
    }

    // Fall back to the first available device so follow-up calls can reuse it.
    selectedDevice = devices[0];
    return true;
}

function getAdbManager(): AdbManager {
    if (!_manager) {
        try {
            _manager = new AdbManager();
        } catch (e) {
            console.error("Failed to initialize AdbManager. WebUSB might not be supported.", e);
            throw e;
        }
    }
    return _manager;
}

async function getAdbConnection(): Promise<Adb> {
    const hasConnectedDevice = await _syncSelectedDevice();

    // if user haven't connected a device yet, prompt them to select one.
    // This is needed for the first time usage.
    if (!hasConnectedDevice) {
        const device = await getAdbManager().requestDevice();
        if (!device) {
            throw new Error('WebADB: No device selected');
        }
        selectedDevice = device;
    }

    if (!selectedDevice) {
        throw new Error('WebADB: No ADB device connected');
    }

    return await getAdbManager().connect(selectedDevice);
}

export async function isAdbDeviceConnected(): Promise<boolean> {
    try {
        return await _syncSelectedDevice();
    } catch (error) {
        console.error('Failed to check ADB device connection', error);
        return false;
    }
}

export async function reconnectAdbDevice(): Promise<boolean> {
    const device = await getAdbManager().requestDevice();
    if (!device) {
        return false;
    }
    selectedDevice = device;
    return true;
}

export async function captureAdbScreenshot(): Promise<File> {
    const adb = await getAdbConnection();
    const socket = await adb.subprocess.shellProtocol!.spawn('screencap -p');
    const reader = socket.stdout.getReader();

    const chunks: Uint8Array[] = [];
    try {
        while (true) {
            const {done, value} = await reader.read();
            if (done) {
                break;
            }
            chunks.push(value);
        }
    } finally {
        reader.releaseLock();
        await adb.close();
    }
    const blob = new Blob(chunks as BlobPart[], {type: 'image/png'});
    const fileName = `screenshot_${new Date().toISOString().replace(/[:.]/g, '-')}.png`;
    return new File([blob], fileName, {type: 'image/png'});
}