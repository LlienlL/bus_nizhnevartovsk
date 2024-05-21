import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import MapComponent from '../Map1'; // Убедитесь, что путь к вашему компоненту правильный

jest.mock('react-leaflet', () => {
  const originalModule = jest.requireActual('react-leaflet');
  return {
    ...originalModule,
    MapContainer: ({ children }) => <div>{children}</div>,
    TileLayer: () => <div>TileLayer</div>,
  };
});

jest.mock('leaflet', () => {
  const originalModule = jest.requireActual('leaflet');
  return {
    ...originalModule,
    Icon: jest.fn(() => ({})),
  };
});

describe('Sidebar in MapComponent', () => {
  test('toggles sidebar visibility', () => {
    render(<MapComponent />);
    
    // Initial state, sidebar should be hidden
    const toggleButton = screen.getByText('>');
    expect(toggleButton).toBeInTheDocument();
    
    // Click the button to show the sidebar
    fireEvent.click(toggleButton);
    expect(toggleButton).toHaveTextContent('<');

    // Check if sidebar content is visible
    const sidebar = screen.getByText('Все маршруты');
    expect(sidebar).toBeInTheDocument();

    // Click the button to hide the sidebar
    fireEvent.click(toggleButton);
    expect(toggleButton).toHaveTextContent('>');

    // Sidebar content should not be visible
    expect(screen.queryByText('Все маршруты')).not.toBeInTheDocument();
  });
});
