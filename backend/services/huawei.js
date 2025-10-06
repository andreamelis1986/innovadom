const ModbusRTU = require("modbus-serial");
const client = new ModbusRTU();

async function readHuaweiData() {
  try {
    await client.connectTCP("192.168.1.45", { port: 502 }); // IP inverter
    client.setID(1);

    const soc = await client.readHoldingRegisters(37004, 1); // State of Charge (% * 100)
    const power = await client.readHoldingRegisters(32080, 1); // PV Power (W)
    const gridPower = await client.readHoldingRegisters(37113, 1); // Grid active power (W)
    const batteryPower = await client.readHoldingRegisters(37107, 1); // Battery charge/discharge

    return {
      soc: soc.data[0] / 100, // battery %
      pvPower: power.data[0],
      gridPower: gridPower.data[0],
      batteryPower: batteryPower.data[0],
    };
  } catch (err) {
    console.error("Errore connessione Modbus:", err.message);
    return null;
  } finally {
    client.close();
  }
}

module.exports = { readHuaweiData };
