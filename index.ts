import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { SerialPort } from 'serialport';
import { ReadlineParser } from '@serialport/parser-readline';
// https://serialport.io/docs/api-parser-readline
import { getFirestore, collection, addDoc } from 'firebase/firestore';
import { ILed } from './interfaces/led.interface';
import { firebase } from './firebase/config';
import { IRfid } from './interfaces/rfid.interface';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

const arduinoSerialPort = new SerialPort({ path: 'COM6', baudRate: 9600 });
const arduinoSerialPort2 = new SerialPort({ path: 'COM7', baudRate: 9600 });
const parser = arduinoSerialPort.pipe(new ReadlineParser({ delimiter: '\r\n' }));

const db = getFirestore(firebase);

app.use(express.static('public'));
app.use(cors());
app.use(express.json());

arduinoSerialPort.on('open', () => {
  console.log('Conexión con placa Arduino establecida');
});

// arduinoSerialPort.on('data', (data) => {
//   console.log(data.toString());
// });

parser.on('data', async (data) => {
  const lectura: IRfid = JSON.parse(data);
  console.log(lectura);
  try {
    const dataRfid: IRfid = {
      estado: lectura.estado,
      hora: new Date(),
      clave: lectura.clave
    };
    if (lectura.clave) {
      const claveCorrecta = '34, 213, 254, 100, 109';
      if (claveCorrecta === lectura.clave) {
        console.log('Correcto');
        arduinoSerialPort2.write('ACCESO_PERMITIDO');
      } else { 
        console.log('DENEGADO');
        arduinoSerialPort2.write('ACCESO_DENEGADO'); 
      }
    }

    await addDoc(collection(db, 'accesos'), dataRfid);
  } catch (error) {
    console.log(error);
  }
});

app.listen(port, () => {
  console.log('Servidor en ejecución en puerto ' + port);
});

