const express = require('express');
const mssql = require('mssql');
const fs = require('fs');
const cors = require('cors'); // Импортируем пакет cors

const app = express();

app.use(cors()); // Разрешаем CORS для всех запросов

const config = {
  user: 'user',
  password: 'password',
  server: 'server',
  database: 'database',
  options: {
    enableArithAbort: true,
    encrypt: true,
    trustServerCertificate: true,
    cryptoCredentialsDetails: {
      minVersion: 'TLSv1'
    }
  }
};

let filteredData = null; // Переменная для хранения отфильтрованных данных

async function executeProcedureAndSaveToFile() {
  try {
    console.log('Выполнение процедуры...');

    const pool = await mssql.connect(config);
    const result = await pool.request().execute('GetMobilesForIntegration');

    const jsonData = result.recordset.map(item => ({
      LONGITUDE: item.LONGITUDE,
      LATITUDE: item.LATITUDE,
      SPEED: item.SPEED,
      ROUTE_TRIP_ID: item.ROUTE_TRIP_ID,
      ROUTE_ID: item.ROUTE_ID,
      NEXT_BUSSTOP_ID: item.NEXT_BUSSTOP_ID,
      NEXT_BUSSTOP_TIME: item.NEXT_BUSSTOP_TIME
    }));

    fs.writeFile('GetMobilesForIntegration.json', JSON.stringify(jsonData, null, 2), (err) => {
      if (err) {
        console.error('Error writing JSON to file:', err);
        return;
      }
      console.log('Результат в GetMobilesForIntegration.json');

      // Чтение данных из JSON файла и фильтрация
      fs.readFile('GetMobilesForIntegration.json', 'utf8', (err, data) => {
        if (err) {
          console.error('Error reading JSON file:', err);
          return;
        }

        try {
          const jsonData = JSON.parse(data);
          filteredData = jsonData.filter(item => item.ROUTE_TRIP_ID !== null);
          console.log('Отфильтрованные non-null ROUTE_Trip_ID:', filteredData);
        } catch (error) {
          console.error('Error parsing JSON data:', error);
        }
      });
    });
  } catch (error) {
    console.error('Error executing procedure:', error);
  }
}

async function executeAnotherProcedureAndSaveToFile() {
  try {
    console.log('Выполнение GetBusstopsForIntegration процедуры...');

    // Получение текущей даты в формате 'yyyy-mm-dd'
    const currentDate = new Date().toISOString().split('T')[0];

    const pool = await mssql.connect(config);
    const request = pool.request();
    request.input('date', mssql.Date, currentDate); // Передача текущей даты в качестве параметра

    const result = await request.execute('GetBusstopsForIntegration');

    const jsonData = result.recordset.map(item => ({
      BUSSTOP_ID: item.BUSSTOP_ID,
      BUSSTOP_NAME: item.BUSSTOP_NAME,
      BUSSTOP_LONGITUDE: item.BUSSTOP_LONGITUDE,
      BUSSTOP_LATITUDE: item.BUSSTOP_LATITUDE
    }));

    fs.writeFile('GetBusstopsForIntegration.json', JSON.stringify(jsonData, null, 2), (err) => {
      if (err) {
        console.error('Error writing JSON to file:', err);
        return;
      }
      console.log('Результат в GetBusstopsForIntegration.json');
    });
  } catch (error) {
    console.error('Error executing procedure:', error);
  }
}

async function executeRouteTripsProcedureAndSaveToFile() {
  try {
    console.log('Выполнение процедуры GetRouteTripsForIntegration...');

    // Получение текущей даты в формате 'yyyy-mm-dd'
    const currentDate = new Date().toISOString().split('T')[0];

    const pool = await mssql.connect(config);
    const request = pool.request();
    request.input('date', mssql.Date, currentDate); // Передача текущей даты в качестве параметра

    const result = await request.execute('GetRouteTripsForIntegration');

    const jsonData = result.recordset.map(item => ({
      ROUTE_NUMBER: item.ROUTE_NUMBER,
      ROUTE_TRIP_ID: item.ROUTE_TRIP_ID,
      POINT_LONGITUDE: item.POINT_LONGITUDE,
      POINT_LATITUDE: item.POINT_LATITUDE,
      BUSSTOP_ID: item.BUSSTOP_ID
    }));

    fs.writeFile('GetRouteTripsForIntegration.json', JSON.stringify(jsonData, null, 2), (err) => {
      if (err) {
        console.error('Error writing JSON to file:', err);
        return;
      }
      console.log('Результат в GetRouteTripsForIntegration.json');
    });
  } catch (error) {
    console.error('Error executing procedure:', error);
  }
}

// Вызываем процедуру и сохраняем данные в JSON один раз при запуске сервера
executeRouteTripsProcedureAndSaveToFile();
executeProcedureAndSaveToFile();
executeAnotherProcedureAndSaveToFile();

// Функция для обновления данных каждые 7 секунд
setInterval(() => {
  executeProcedureAndSaveToFile();
}, 6000);

app.get('/api/data', (req, res) => {
  try {
    if (filteredData) {
      res.json(filteredData); // Просто отправляем отфильтрованные данные
    } else {
      throw new Error('Filtered data not available');
    }
  } catch (error) {
    console.error('Error retrieving data:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/routeTripsData', (req, res) => {
  try {
    fs.readFile('GetRouteTripsForIntegration.json', 'utf8', (err, data) => {
      if (err) {
        console.error('Error reading JSON file:', err);
        throw new Error('Failed to read JSON file');
      }

      const jsonData = JSON.parse(data);
      res.json(jsonData);
    });
  } catch (error) {
    console.error('Error retrieving route trips data:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/busStop', (req, res) => {
  try {
    fs.readFile('GetBusstopsForIntegration.json', 'utf8', (err, data) => {
      if (err) {
        console.error('Error reading JSON file:', err);
        throw new Error('Failed to read JSON file');
      }

      const jsonData = JSON.parse(data);
      res.json(jsonData);
    });
  } catch (error) {
    console.error('Error retrieving new data:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/filteredData', (req, res) => {
  try {
    if (filteredData) {
      // Отфильтруем данные по полю ROUTE_ID и выберем только необходимые поля
      const filteredAndSelectedData = filteredData
        .filter(item => item.ROUTE_TRIP_ID !== null) // Фильтруем по не null ROUTE_ID
        .map(item => ({
          LONGITUDE: item.LONGITUDE,
          LATITUDE: item.LATITUDE,
          SPEED: item.SPEED,
          ROUTE_TRIP_ID: item.ROUTE_TRIP_ID
        }));
      res.json(filteredAndSelectedData); // Отправляем отфильтрованные и выбранные данные
    } else {
      throw new Error('Filtered data not available');
    }
  } catch (error) {
    console.error('Error retrieving filtered data:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

const PORT = process.env.PORT || 3002;
app.listen(PORT, () => console.log(`сервер работает на порту ${PORT}`));
