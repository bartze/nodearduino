import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { SerialPort } from 'serialport';
import { ReadlineParser } from '@serialport/parser-readline';
import { getFirestore, collection, addDoc, getDocs, query, where } from 'firebase/firestore';
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

parser.on('data', async (data) => {
  const lectura: IRfid = JSON.parse(data);
  console.log(lectura);

  try {
    const usuariosRef = collection(db, 'usuarios');
    const usuariosSnapshot = await getDocs(usuariosRef);
    const clavesRegistradas = usuariosSnapshot.docs.map(doc => doc.data().clave);

    const q = query(collection(db, 'usuarios'), where('clave', '==', lectura.clave));
    const querySnapshot = await getDocs(q);
    const users = querySnapshot.docs.map(doc => doc.data());
    const hasActiveUser = users.some(user => user.activo === true);

    if (lectura.clave) {
      if (hasActiveUser) {
        arduinoSerialPort2.write('Hola: ' + users[0].nombre);
         //arduinoSerialPort2.write('1');
        // { estado: 'Acceso Denegado', clave: '34, 213, 254, 100, 109' }
        // [ { nombre: 'Iñaki', clave: '34, 213, 254, 100, 109', activo: true } ]
        // Acceso permitido

        // const encoder = new TextEncoder();
        // const utf8Array = encoder.encode(nombre);
        // const utf8String = String.fromCharCode.apply(null, utf8Array);
        
        console.log('Acceso permitido');

        //IMPRIMIR STRING EN LCD
        // arduinoSerialPort2.write(nombre[0] );
        // arduinoSerialPort2.write('ACCESO_PERMITIDO');
      } else {
        //BOOLEAN FALSE
        arduinoSerialPort2.write('0');
        console.log('Acceso denegado');
        arduinoSerialPort2.write('ACCESO_DENEGADO');
      }
    }
    // "34, 213, 254, 100, 109"

    await addDoc(collection(db, 'accesos'), lectura);
  } catch (error) {
    console.log(error);
  }
});

app.listen(port, () => {
  console.log('Servidor en ejecución en puerto ' + port);
});

