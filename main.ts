/**
 * TCS34725颜色传感器makecode扩展包。
 * Update by xurunhua@139.com
 * 2020.12.29
 */

enum RGB {
    //% block="红"
    RED,
    //% block="绿"
    GREEN,
    //% block="蓝"
    BLUE,
    //% block="全部"
    CLEAR
}

//% color=#3CB371 icon="\uf1b3" block="颜色传感器"
namespace TCS34725 {

    enum LCS_Constants {
        // Constants
        ADDRESS = 0x29,
        ID = 0x12, // Register should be equal to 0x44 for the TCS34721 or TCS34725, or 0x4D for the TCS34723 or TCS34727.

        COMMAND_BIT = 0x80,

        ENABLE = 0x00,
        ENABLE_AIEN = 0x10, // RGBC Interrupt Enable
        ENABLE_WEN = 0x08, // Wait enable - Writing 1 activates the wait timer
        ENABLE_AEN = 0x02, // RGBC Enable - Writing 1 actives the ADC, 0 disables it
        ENABLE_PON = 0x01, // Power on - Writing 1 activates the internal oscillator, 0 disables it
        ATIME = 0x01, // Integration time
        WTIME = 0x03, // Wait time (if ENABLE_WEN is asserted)
        AILTL = 0x04, // Clear channel lower interrupt threshold
        AILTH = 0x05,
        AIHTL = 0x06, // Clear channel upper interrupt threshold
        AIHTH = 0x07,
        CONFIG = 0x0D,
        CONFIG_WLONG = 0x02, // Choose between short and long (12x) wait times via WTIME
        CONTROL = 0x0F, // Set the gain level for the sensor
        STATUS = 0x13,
        STATUS_AINT = 0x10, // RGBC Clean channel interrupt
        STATUS_AVALID = 0x01, // Indicates that the RGBC channels have completed an integration cycle

        CDATAL = 0x14, // Clear channel data
        CDATAH = 0x15,
        RDATAL = 0x16, // Red channel data
        RDATAH = 0x17,
        GDATAL = 0x18, // Green channel data
        GDATAH = 0x19,
        BDATAL = 0x1A, // Blue channel data
        BDATAH = 0x1B,

        GAIN_1X = 0x00, //  1x gain
        GAIN_4X = 0x01, //  4x gain
        GAIN_16X = 0x02, // 16x gain
        GAIN_60X = 0x03  // 60x gain
    }

    // I2C functions

    function I2C_WriteReg8(addr: number, reg: number, val: number) {
        let buf = pins.createBuffer(2)
        buf.setNumber(NumberFormat.UInt8BE, 0, reg)
        buf.setNumber(NumberFormat.UInt8BE, 1, val)
        pins.i2cWriteBuffer(addr, buf)
    }

    function I2C_ReadReg8(addr: number, reg: number): number {
        let buf = pins.createBuffer(1)
        buf.setNumber(NumberFormat.UInt8BE, 0, reg)
        pins.i2cWriteBuffer(addr, buf)
        buf = pins.i2cReadBuffer(addr, 1)
        return buf.getNumber(NumberFormat.UInt8BE, 0);
    }

    function I2C_ReadReg16(addr: number, reg: number): number {
        let buf = pins.createBuffer(1)
        buf.setNumber(NumberFormat.UInt8BE, 0, reg)
        pins.i2cWriteBuffer(addr, buf)
        buf = pins.i2cReadBuffer(addr, 2)
        return ((buf.getNumber(NumberFormat.UInt8BE, 1) << 8) | buf.getNumber(NumberFormat.UInt8BE, 0));
    }

    function LCS_enable() {
        // Set the power and enable bits.
        I2C_WriteReg8(LCS_Constants.ADDRESS, (LCS_Constants.COMMAND_BIT | LCS_Constants.ENABLE), LCS_Constants.ENABLE_PON)
        basic.pause(10) // not sure if this is right    time.sleep(0.01) // FIXME delay for 10ms
        I2C_WriteReg8(LCS_Constants.ADDRESS, (LCS_Constants.COMMAND_BIT | LCS_Constants.ENABLE), (LCS_Constants.ENABLE_PON | LCS_Constants.ENABLE_AEN))
    }

    function LCS_set_integration_time(time: number) {
        let val = 0x100 - (time / 0.0024) // FIXME was cast to int type
        if (val > 255) {
            val = 255
        } else if (val < 0) {
            val = 0
        }
        I2C_WriteReg8(LCS_Constants.ADDRESS, (LCS_Constants.COMMAND_BIT | LCS_Constants.ATIME), val)
    }

    function LCS_set_gain(gain: number) {
        I2C_WriteReg8(LCS_Constants.ADDRESS, (LCS_Constants.COMMAND_BIT | LCS_Constants.CONTROL), gain)
    }

    /**
     * 初始化硬件设备
     */
    //% blockId="initialize_sensor" block="初始化传感器"
    //% weight=100 
    export function LCS_initialize() {
        let iic_address = LCS_Constants.ADDRESS
        pins.i2cWriteNumber(iic_address, 0x80 | 0x12, NumberFormat.Int8LE, false)
        pins.i2cWriteNumber(iic_address, 0x80 | 0x00, NumberFormat.Int8LE, true)
        pins.i2cWriteNumber(iic_address, 1, NumberFormat.Int8LE, false)
        basic.pause(10)
        pins.i2cWriteNumber(iic_address, 0x80 | 0x00, NumberFormat.Int8LE, true)
        pins.i2cWriteNumber(iic_address, 3, NumberFormat.Int8LE, false)

        // Set default integration time and gain.
        LCS_set_integration_time(0.0024)
        LCS_set_gain(LCS_Constants.GAIN_4X)

        // // Make sure we're connected to the right sensor.
        // let chip_id = I2C_ReadReg8(LCS_Constants.ADDRESS, (LCS_Constants.COMMAND_BIT | LCS_Constants.ID))

        // if (chip_id != 0x44) {
        //     return // Incorrect chip ID
        // }

        // // Set default integration time and gain.
        // LCS_set_integration_time(0.0024)
        // LCS_set_gain(LCS_Constants.GAIN_4X)

        // // Enable the device (by default, the device is in power down mode on bootup).
        // LCS_enable()
    }

    /**
     * 读取检测到的颜色RGB值
     * @param color 颜色类型, eg: 3
     */
    //% blockId="getSensorData" block="读取颜色RGB值 %color"
    //% weight=99 
    export function getColorData(color: RGB): number {
        let sum = I2C_ReadReg16(LCS_Constants.ADDRESS, (LCS_Constants.COMMAND_BIT | LCS_Constants.CDATAL));
        let red = I2C_ReadReg16(LCS_Constants.ADDRESS, (LCS_Constants.COMMAND_BIT | LCS_Constants.RDATAL));
        let green = I2C_ReadReg16(LCS_Constants.ADDRESS, (LCS_Constants.COMMAND_BIT | LCS_Constants.GDATAL));
        let blue = I2C_ReadReg16(LCS_Constants.ADDRESS, (LCS_Constants.COMMAND_BIT | LCS_Constants.BDATAL));

        /* Set a delay for the integration time */
        basic.pause(24);

        red = Math.round(red / sum * 255);
        green = Math.round(green / sum * 255);
        blue = Math.round(blue / sum * 255);

        if (red > 128 && red > green*2 && red > blue*2) {
            red = 255;
            green = Math.round(green/2);
            blue = Math.round(blue/2);
        }
        if (green > 128 && green > red*2 && green > blue*2) {
            green = 255;
            red = Math.round(red/2);
            blue = Math.round(blue/2);
        }
        if (blue > 128 && blue > red*2 && blue > green*2) {
            blue = 255;
            red = Math.round(red/2);
            green = Math.round(green/2);
        }
        
        switch (color) {
            case RGB.RED:
                return red;
                break;

            case RGB.GREEN:
                return green;
               break;

            case RGB.BLUE:
                return blue;
                break;

            case RGB.CLEAR:
                return sum;
        }
    }

    /**
     * 读取到的主颜色：红、绿、蓝
     */
    //% blockId="getColor" block="读取到的主颜色"
    //% weight=97 
    export function getColor(): RGB {
        let r = I2C_ReadReg16(LCS_Constants.ADDRESS, (LCS_Constants.COMMAND_BIT | LCS_Constants.RDATAL));
        let g =  I2C_ReadReg16(LCS_Constants.ADDRESS, (LCS_Constants.COMMAND_BIT | LCS_Constants.GDATAL));
        let b = I2C_ReadReg16(LCS_Constants.ADDRESS, (LCS_Constants.COMMAND_BIT | LCS_Constants.BDATAL));
//        serial.writeLine("R:"+r + " G:" + g + " B:" + b);
         
        /* Set a delay for the integration time */
        basic.pause(24);

        let color = RGB.RED;
        let max = Math.max(r, Math.max(g, b));
        if (max == g) {
            color = RGB.GREEN;
        }
        if (max == b){
            color = RGB.BLUE;
        }

//        serial.writeLine("val: " + color);
        return color;
    }

    /**
     * 返回颜色：红色
     */
    //% blockId="colorRed" block="红色"
    //% weight=92 
    export function colorRed(): RGB {
        return RGB.RED;
    }

    /**
     * 返回颜色：绿色
     */
    //% blockId="colorGreen" block="绿色"
    //% weight=91 
    export function colorGreen(): RGB {
        return RGB.GREEN;
    }
    
    /**
     * 返回颜色：蓝色
     */
    //% blockId="colorBlue" block="蓝色"
    //% weight=90 
    export function colorBlue(): RGB {
        return RGB.BLUE;
    }

}
