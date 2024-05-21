import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import MapComponent from '../Map1'; // Убедитесь, что путь к вашему компоненту правильный

jest.mock('react-leaflet', () => {
  const originalModule = jest.requireActual('react-leaflet');
  return {
    ...originalModule,
    MapContainer: ({ children }) => <div>{children}</div>,
    TileLayer: () => <div>TileLayer</div>,
    Marker: ({ children, position, icon }) => (
      <div data-testid="marker" style={{ position, icon }}>{children}</div>
    ),
    Popup: ({ children }) => <div>{children}</div>,
    Polyline: ({ positions, color }) => <div data-testid="polyline" style={{ positions, color }}></div>,
  };
});

jest.mock('leaflet', () => {
  const originalModule = jest.requireActual('leaflet');
  return {
    ...originalModule,
    Icon: jest.fn(() => ({})),
  };
});

describe('Rendering MapComponent', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve([]),
      })
    );
  });

  test('renders map component', () => {
    render(<MapComponent />);
    expect(screen.getByText('TileLayer')).toBeInTheDocument();
  });

  test('renders markers', async () => {
    const mockBusStopData = [
      { BUSSTOP_LATITUDE: 60.9394, BUSSTOP_LONGITUDE: 76.5731, BUSSTOP_NAME: 'Stop 1', BUSSTOP_ID: 1 },
    ];

    global.fetch = jest.fn((url) => {
      if (url.includes('busStop')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockBusStopData),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve([]),
      });
    });

    render(<MapComponent />);

    // Wait for markers to be rendered
    const marker = await screen.findByTestId('marker');
    expect(marker).toBeInTheDocument();
  });
});
