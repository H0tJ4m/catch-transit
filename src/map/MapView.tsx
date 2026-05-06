import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import MapLibreGL, {
  type CameraRef,
  type MapViewRef,
} from '@maplibre/maplibre-react-native';
import { buildLinesGeoJSON, buildStationsGeoJSON } from './buildOverlays';
import { mumbaiDarkStyle, MUMBAI_CENTER, MUMBAI_DEFAULT_ZOOM } from './styles/mumbai-dark';

MapLibreGL.setAccessToken(null);

export type PlayerMarker = {
  uid: string;
  name: string;
  lat: number;
  lng: number;
  role: 'runner' | 'chaser';
  isMe: boolean;
};

type Props = {
  userLocation?: { lat: number; lng: number } | null;
  highlightedStationId?: string | null;
  onStationPress?: (stationId: string) => void;
  cameraRef?: React.RefObject<CameraRef | null>;
  mapRef?: React.RefObject<MapViewRef | null>;
  playerMarkers?: PlayerMarker[];
};

export function TransitMap({
  userLocation,
  highlightedStationId,
  onStationPress,
  cameraRef,
  mapRef,
  playerMarkers,
}: Props) {
  const linesData = useMemo(() => buildLinesGeoJSON(), []);
  const stationsData = useMemo(() => buildStationsGeoJSON(), []);

  return (
    <View style={styles.container}>
      <MapLibreGL.MapView
        ref={mapRef}
        style={styles.map}
        mapStyle={mumbaiDarkStyle as unknown as object}
        logoEnabled={false}
        attributionEnabled
        compassEnabled
        rotateEnabled
        pitchEnabled={false}
      >
        <MapLibreGL.Camera
          ref={cameraRef}
          defaultSettings={{
            centerCoordinate: MUMBAI_CENTER,
            zoomLevel: MUMBAI_DEFAULT_ZOOM,
          }}
          animationMode="flyTo"
          animationDuration={800}
        />

        <MapLibreGL.ShapeSource id="rail-lines" shape={linesData}>
          <MapLibreGL.LineLayer
            id="rail-lines-casing"
            style={{
              lineColor: '#000',
              lineWidth: 6,
              lineOpacity: 0.6,
              lineCap: 'round',
              lineJoin: 'round',
            }}
          />
          <MapLibreGL.LineLayer
            id="rail-lines-fill"
            style={{
              lineColor: ['get', 'color'],
              lineWidth: 3.5,
              lineCap: 'round',
              lineJoin: 'round',
            }}
          />
        </MapLibreGL.ShapeSource>

        <MapLibreGL.ShapeSource
          id="stations"
          shape={stationsData}
          onPress={(e) => {
            const f = e.features?.[0];
            const id = f?.properties?.id as string | undefined;
            if (id) onStationPress?.(id);
          }}
        >
          <MapLibreGL.CircleLayer
            id="station-circles"
            style={{
              circleRadius: ['case', ['get', 'isInterchange'], 6, 4],
              circleColor: '#0b1220',
              circleStrokeColor: '#f8fafc',
              circleStrokeWidth: 2,
            }}
          />
          <MapLibreGL.SymbolLayer
            id="station-labels"
            minZoomLevel={11.5}
            style={{
              textField: ['get', 'name'],
              textSize: 11,
              textColor: '#e2e8f0',
              textHaloColor: '#0b1220',
              textHaloWidth: 1.5,
              textOffset: [0, 1.2],
              textAnchor: 'top',
              textAllowOverlap: false,
            }}
          />
        </MapLibreGL.ShapeSource>

        {highlightedStationId ? (
          <HighlightLayer stationId={highlightedStationId} />
        ) : null}

        {playerMarkers && playerMarkers.length > 0 ? (
          <MapLibreGL.ShapeSource
            id="players"
            shape={{
              type: 'FeatureCollection',
              features: playerMarkers.map((p) => ({
                type: 'Feature',
                properties: {
                  uid: p.uid,
                  name: p.name,
                  role: p.role,
                  isMe: p.isMe,
                  color: p.role === 'runner' ? '#facc15' : '#f87171',
                },
                geometry: { type: 'Point', coordinates: [p.lng, p.lat] },
              })),
            }}
          >
            <MapLibreGL.CircleLayer
              id="players-halo"
              style={{
                circleRadius: ['case', ['get', 'isMe'], 18, 12],
                circleColor: ['get', 'color'],
                circleOpacity: 0.25,
              }}
            />
            <MapLibreGL.CircleLayer
              id="players-dot"
              style={{
                circleRadius: ['case', ['get', 'isMe'], 9, 7],
                circleColor: ['get', 'color'],
                circleStrokeColor: '#fff',
                circleStrokeWidth: 2,
              }}
            />
            <MapLibreGL.SymbolLayer
              id="players-label"
              style={{
                textField: ['get', 'name'],
                textSize: 11,
                textColor: '#f8fafc',
                textHaloColor: '#0b1220',
                textHaloWidth: 1.5,
                textOffset: [0, 1.4],
                textAnchor: 'top',
              }}
            />
          </MapLibreGL.ShapeSource>
        ) : null}

        {userLocation ? (
          <MapLibreGL.ShapeSource
            id="user"
            shape={{
              type: 'Feature',
              properties: {},
              geometry: { type: 'Point', coordinates: [userLocation.lng, userLocation.lat] },
            }}
          >
            <MapLibreGL.CircleLayer
              id="user-pulse"
              style={{
                circleRadius: 14,
                circleColor: '#38bdf8',
                circleOpacity: 0.25,
              }}
            />
            <MapLibreGL.CircleLayer
              id="user-dot"
              style={{
                circleRadius: 7,
                circleColor: '#38bdf8',
                circleStrokeColor: '#fff',
                circleStrokeWidth: 2,
              }}
            />
          </MapLibreGL.ShapeSource>
        ) : null}
      </MapLibreGL.MapView>
    </View>
  );
}

function HighlightLayer({ stationId }: { stationId: string }) {
  const features = useMemo(() => {
    const all = buildStationsGeoJSON();
    const match = all.features.find((f) => f.properties.id === stationId);
    return match
      ? { type: 'FeatureCollection' as const, features: [match] }
      : { type: 'FeatureCollection' as const, features: [] };
  }, [stationId]);

  return (
    <MapLibreGL.ShapeSource id="highlight" shape={features}>
      <MapLibreGL.CircleLayer
        id="highlight-ring"
        style={{
          circleRadius: 18,
          circleColor: '#facc15',
          circleOpacity: 0.25,
          circleStrokeColor: '#facc15',
          circleStrokeWidth: 2,
        }}
      />
    </MapLibreGL.ShapeSource>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
});
