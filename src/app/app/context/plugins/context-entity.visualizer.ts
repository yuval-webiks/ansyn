import olPoint from 'ol/geom/Point';
import olPolygon from 'ol/geom/Polygon';
import { getTimeDiff, getTimeDiffFormat, selectOverlayByMapId, } from '@ansyn/map-facade';
import { getPointByGeometry, ImageryCommunicatorService, ImageryVisualizer, IVisualizerEntity } from '@ansyn/imagery';
import GeoJSON from 'ol/format/GeoJSON';
import { Observable } from 'rxjs';
import { Actions } from '@ngrx/effects';
import { select, Store } from '@ngrx/store';
import { filter, map, tap } from 'rxjs/operators';
import { AutoSubscription } from 'auto-subscriptions';
import { IOverlay, } from '@ansyn/ansyn';
import { EntitiesVisualizer, OpenLayersMap } from '@ansyn/ol';

@ImageryVisualizer({
	supported: [OpenLayersMap],
	deps: [Actions, Store, ImageryCommunicatorService]
})
export class ContextEntityVisualizer extends EntitiesVisualizer {
	referenceDate: Date;
	idToCachedCenter: Map<string, olPolygon | olPoint> = new Map<string, olPolygon | olPoint>();
	geoJsonFormat: GeoJSON;

	constructor(protected actions$: Actions, protected store$: Store<any>) {
		super();

		this.updateStyle({
			initial: {
				stroke: '#3DCC33',
				fill: '#3DCC33',
				'fill-opacity': 0,
				icon: {
					scale: 1,
					src: 'assets/icons/map/entity-marker.svg',
					anchor: [0.5, 1]
				},
				geometry: this.getGeometry.bind(this),
				label: {
					fontSize: 12,
					fill: '#fff',
					stroke: '#000',
					'stroke-width': 3,
					offsetY: 30,
					text: this.getText.bind(this)
				}
			}
		});

		this.geoJsonFormat = new GeoJSON();
	}

	@AutoSubscription
	referenceDate$ = () => this.store$
		.pipe(
			select(selectOverlayByMapId(this.mapId)),
			filter(Boolean),
			map((overlay: IOverlay) => overlay.date),
			tap((referenceDate) => {
				this.referenceDate = referenceDate;
				this.purgeCache();
				this.source.changed();
			})
		);

	addOrUpdateEntities(logicalEntities: IVisualizerEntity[]): Observable<boolean> {
		logicalEntities.forEach((entity) => {
			if (this.idToCachedCenter.has(entity.id)) {
				this.idToCachedCenter.delete(entity.id);
			}
		});
		return super.addOrUpdateEntities(logicalEntities);
	}

	private getText(feature) {
		if (!this.referenceDate || !(this.getGeometry(feature) instanceof olPoint)) {
			return '';
		}
		const originalEntity: any = this.idToEntity.get(feature.getId()).originalEntity;
		const entityDate = originalEntity.date;
		const timeDiff = getTimeDiff(this.referenceDate, entityDate);

		return getTimeDiffFormat(timeDiff);
	}

	private getGeometry(originalFeature) {
		const featureId = originalFeature.getId();
		if (this.idToCachedCenter.has(featureId)) {
			return this.idToCachedCenter.get(featureId);
		}

		const entityMap = this.idToEntity.get(featureId);

		if (<any>entityMap.originalEntity.featureJson.geometry.type === 'Point') {
			const featureGeoJson = <any>this.geoJsonFormat.writeFeatureObject(entityMap.feature);
			const centroid = getPointByGeometry(featureGeoJson.geometry);
			const point = new olPoint(<[number, number]>centroid.coordinates);

			this.idToCachedCenter.set(featureId, point);
			return point;
		} else if (<any>entityMap.originalEntity.featureJson.geometry.type === 'Polygon') {
			const projectedPolygon = entityMap.feature.getGeometry() as olPolygon;

			this.idToCachedCenter.set(featureId, projectedPolygon);
			return projectedPolygon;
		}
	}

}
