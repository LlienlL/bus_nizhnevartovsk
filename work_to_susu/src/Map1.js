import React from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import './Map.css';
import customMarkerIcon from './customMarkerIcon.png'; // Путь к вашей кастомной иконке маркера
import busStopIconImage from './bus.png'; // Путь к иконке остановки

class MapComponent extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      lat: 60.9394,
      lng: 76.5731,
      zoom: 13,
      routeNumber: null,
      routeData: [],
      sidebarVisible: false,
      filteredData: [],
      busStopData: [],
      routeTripsData: [],
      routeCoordinates: {}, // Добавляем состояние для хранения координат маршрутов
      selectedVector: null, // Добавляем состояние для хранения выбранного вектора
      firstCheckboxChecked: true, // Инициализируем первый чекбокс как выбранный
      nextBusStopTime: {}, // Добавляем объект для хранения времени следующего автобуса для каждой остановки
    };
  }

  toggleSidebar = () => {
    this.setState((prevState) => ({
      sidebarVisible: !prevState.sidebarVisible,
    }));
  };

  fetchBusStopFromServer = async () => {
    try {
      const response = await fetch('http://localhost:3002/api/busStop');
      if (!response.ok) {
        throw new Error('Failed to fetch bus stop data');
      }
      const busStopData = await response.json();
      this.setState({ busStopData });

      // обновляем состояние времени до прибытия автобуса
      const nextBusStopTime = {};
      busStopData.forEach(stop => {
        nextBusStopTime[stop.BUSSTOP_ID] = ''; // инициализируем пустым значением
      });
      this.setState({ nextBusStopTime });

      // затем вызываем fetchDataFromServer
      this.fetchDataFromServer();
    } catch (error) {
      console.error('Error fetching bus stop data:', error);
    }
  };

  fetchDataFromServer = async () => {
    try {
      const response = await fetch('http://localhost:3002/api/filteredData');
      if (!response.ok) {
        throw new Error('Failed to fetch data');
      }
      const data = await response.json();
      this.setState({ filteredData: data });
      console.log(data)
      // обновляем состояние времени до прибытия автобуса
      const nextBusStopTime = { ...this.state.nextBusStopTime }; // делаем копию состояния
      data.forEach(item => {
        // проверяем, есть ли информация о времени до прибытия автобуса для текущей остановки
        if (nextBusStopTime.hasOwnProperty(item.NEXT_BUSSTOP_ID)) {
          nextBusStopTime[item.NEXT_BUSSTOP_ID] = item.NEXT_BUSSTOP_TIME;
        }
      });
      this.setState({ nextBusStopTime });
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  fetchRouteTripsFromServer = async () => {
    try {
      const response = await fetch('http://localhost:3002/api/routeTripsData');
      if (!response.ok) {
        throw new Error('Failed to fetch route trips data');
      }
      const routeTripsData = await response.json();
  
      // Создаем объект для хранения координат по route_id
      const coordinatesByRouteId = {};
  
      // Проходим по всем данным и группируем координаты по route_id
      routeTripsData.forEach(item => {
        const { ROUTE_TRIP_ID, POINT_LATITUDE, POINT_LONGITUDE } = item;
        if (ROUTE_TRIP_ID) {
          if (!coordinatesByRouteId[ROUTE_TRIP_ID]) {
            coordinatesByRouteId[ROUTE_TRIP_ID] = [];
          }
          coordinatesByRouteId[ROUTE_TRIP_ID].push([parseFloat(POINT_LATITUDE), parseFloat(POINT_LONGITUDE)]);
        }
      });
  
      // Устанавливаем состояние с собранными координатами по route_id
      this.setState({ routeCoordinates: coordinatesByRouteId });
    } catch (error) {
      console.error('Error fetching route trips data:', error);
    }
  };

  handleFirstCheckboxChange = (event) => {
    // Устанавливаем состояние первого чекбокса в зависимости от его текущего состояния
    this.setState((prevState) => ({
      firstCheckboxChecked: !prevState.firstCheckboxChecked,
    }));
  
    // Если первый чекбокс становится активным, делаем остальные чекбоксы неактивными
    if (!this.state.firstCheckboxChecked) {
      [this.checkbox2, this.checkbox3, this.checkbox4].forEach((checkbox) => {
        if (checkbox) {
          checkbox.checked = false;
        }
      });
    }
  };

  // Обработчик события для других чекбоксов
  handleOtherCheckboxChange = (event) => {
    if (event.target.checked) {
      // Если пользователь выбрал другой чекбокс, делаем первый чекбокс неактивным
      this.setState({ firstCheckboxChecked: false });
    }
  };

  componentDidMount() {
    this.fetchDataFromServer();
    this.fetchBusStopFromServer();
    this.fetchRouteTripsFromServer();
    this.interval = setInterval(() => {
      this.fetchDataFromServer();
    }, 6000);

    // Создаем и инициализируем busStopIcon
    this.busStopIcon = new L.Icon({
      iconUrl: busStopIconImage, // путь к вашей иконке остановки
      iconSize: [32, 32],
      iconAnchor: [16, 32],
      popupAnchor: [0, -32],
      className: 'bus-stop-icon' // Добавляем класс иконке остановки
    });

    // Создаем и инициализируем customIcon
    this.customIcon = new L.Icon({
      iconUrl: customMarkerIcon,
      iconSize: [32, 32],
      iconAnchor: [16, 32],
      popupAnchor: [0, -32],
      className: 'custom-icon' // Добавляем класс кастомной иконке
    });
  }

  componentWillUnmount() {
    clearInterval(this.interval);
  }
  
  render() {
    const center = [this.state.lat, this.state.lng];

    return (
      <div className="map-container">
        <div className={`sidebar ${this.state.sidebarVisible ? 'visible' : ''}`}>
          {this.state.sidebarVisible && (
            <div>
              <p>-------------------</p>
              {/* Добавляем чекбокс */}
              <label className="sidebar-checkbox" htmlFor="checkbox1">
              <input
                  ref={(ref) => (this.checkbox1 = ref)} // Сохраняем ссылку на чекбокс
                  id="checkbox1"
                  type="checkbox"
                  checked={this.state.firstCheckboxChecked} // Устанавливаем состояние чекбокса
                  onChange={this.handleFirstCheckboxChange} // Используем обработчик события
                />
                Все маршруты
              </label>
              <p>-------------------</p>
              <br />
              {/* Добавляем линию */}
              {/* <div className="sidebar-line"></div>
              <br /> */}
              {/* Добавляем еще три чекбокса */}
              <label className="sidebar-checkbox" htmlFor="checkbox2">
              <input
                  ref={(ref) => (this.checkbox2 = ref)} // Сохраняем ссылку на чекбокс
                  id="checkbox2"
                  type="checkbox"
                  onChange={this.handleOtherCheckboxChange} // Используем обработчик события
                />
                6
              </label>
              <br />
              <label className="sidebar-checkbox" htmlFor="checkbox3">
              <input
                  ref={(ref) => (this.checkbox3 = ref)} // Сохраняем ссылку на чекбокс
                  id="checkbox3"
                  type="checkbox"
                  onChange={this.handleOtherCheckboxChange} // Используем обработчик события
                />
                7
              </label>
              <br />
              <label className="sidebar-checkbox" htmlFor="checkbox4">
              <input
                  ref={(ref) => (this.checkbox4 = ref)} // Сохраняем ссылку на чекбокс
                  id="checkbox4"
                  type="checkbox"
                  onChange={this.handleOtherCheckboxChange} // Используем обработчик события
                />
                16
              </label>
            </div>
          )}
        </div>
        <MapContainer zoom={this.state.zoom} center={center} zoomControl={false} onZoomEnd={(e) => console.log('Current Zoom Level:', e.target.getZoom())}>
          <TileLayer
            attribution='&amp;copy <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {/* Добавляем маркеры с всплывающими окнами (Popup) для данных об остановках */}
          {this.state.busStopData.map((stop, index) => (
            <Marker
            key={index}
            position={[stop.BUSSTOP_LATITUDE, stop.BUSSTOP_LONGITUDE]}
            icon={this.busStopIcon}
            zIndexOffset={100}
          >
            <Popup closeButton={false}>
              <div>
                <p>Название остановки: {stop.BUSSTOP_NAME}</p>               
                {/* добавляем отображение времени до прибытия автобуса */}
                {this.state.nextBusStopTime[stop.BUSSTOP_ID] && (
                  <p>Время до прибытия: {this.state.nextBusStopTime[stop.BUSSTOP_ID]}</p>
                )}
              </div>
            </Popup>
          </Marker>
          ))}
          {/* Добавляем маркеры с всплывающими окнами (Popup) для отфильтрованных данных */}
          {this.state.filteredData.map((item, index) => (
            <Marker
              key={index}
              position={[item.LATITUDE, item.LONGITUDE]}
              icon={this.customIcon}
              zIndexOffset={500}
              eventHandlers={{
                click: () => {
                  // Получаем координаты маршрута по выбранному ROUTE_TRIP_ID
                  const selectedRouteCoordinates = this.state.routeCoordinates[item.ROUTE_TRIP_ID];
                  // Проверяем, был ли уже выбран этот маршрут
                  if (this.state.routeNumber === item.ROUTE_TRIP_ID) {
                    // Если да, то скрываем вектор
                    this.setState({
                      selectedVector: null,
                      routeNumber: null
                    });
                  } else {
                    // Если нет, то обновляем выбранный векторный маршрут и маршрутный номер
                    this.setState({
                      selectedVector: (
                        <Polyline
                          positions={selectedRouteCoordinates}
                          color="red"
                        />
                      ),
                      routeNumber: item.ROUTE_TRIP_ID
                    });
                  }
                }
              }}
            >
              <Popup closeButton={false} bubblingMouseEvents={true}>
                <div>
                  {/* <p>Широта: {item.LATITUDE}</p>
                  <p>Долгота: {item.LONGITUDE}</p> */}
                  <p>Номер автобуса: {item.ROUTE_ID}</p>
                  <p>Скорость: {item.SPEED}</p>

                </div>
              </Popup>
            </Marker>
          ))}
          {/* Добавляем выбранный вектор */}
          {this.state.selectedVector}
        </MapContainer>
        <button
          className="sidebar-toggle-btn"
          onClick={this.toggleSidebar}
          style={{ left: this.state.sidebarVisible ? '210px' : '10px' }}
        >
          {this.state.sidebarVisible ? '<' : '>'}
        </button>
      </div>
    );
  }
}

export default MapComponent;

