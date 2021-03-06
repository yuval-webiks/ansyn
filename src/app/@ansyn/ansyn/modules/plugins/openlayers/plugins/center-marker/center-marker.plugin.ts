import Vector from 'ol/source/Vector';
import Feature from 'ol/Feature';
import Point from 'ol/geom/Point';
import Style from 'ol/style/Style';
import Icon from 'ol/style/Icon';
import VectorLayer from 'ol/layer/Vector';
import { BaseImageryMap, BaseImageryPlugin, IImageryMapPosition, ImageryPlugin } from '@ansyn/imagery';
import { Observable, of } from 'rxjs';
import { AutoSubscription } from 'auto-subscriptions';
import { OpenLayersMap } from '@ansyn/ol';

@ImageryPlugin({
	supported: [OpenLayersMap],
	deps: []
})
export class CenterMarkerPlugin extends BaseImageryPlugin {

	public set isEnabled(value: boolean) {
		if (this._isEnabled !== value) {
			this._isEnabled = value;

			if (this.isEnabled) {
				this.tryDrawCenter();
			} else {
				this.tryDeleteCenter();
			}
		}
	}

	public get isEnabled(): boolean {
		return this._isEnabled;
	}
	private _iconStyle: Style;
	private _existingLayer;

	private _isEnabled: boolean;

	constructor() {
		super();
		this._isEnabled = false;

		this._iconStyle = new Style({
			image: new Icon(/** @type {olx.style.IconOptions} */ ({
				anchor: [0.5, 46],
				anchorXUnits: 'fraction',
				anchorYUnits: 'pixels',
				src: 'assets/icons/filters.svg'
			}))
		});

	}

	@AutoSubscription
	positionChanged$ = () => this.communicator.positionChanged.subscribe((position: IImageryMapPosition) => {
		if (this.isEnabled) {
			this.tryDrawCenter();
		} else {
			this.tryDeleteCenter();
		}
	});

	onResetView(): Observable<boolean> {
		return of(true);
	}

	public dispose() {
		super.dispose();
		this.tryDeleteCenter();
	}

	private tryDeleteCenter() {
		if (this._existingLayer) {
			this.communicator.removeLayer(this._existingLayer);
			this._existingLayer = null;
		}
	}

	private tryDrawCenter() {

		this.tryDeleteCenter();

		if (!this._isEnabled) {
			return;
		}

		const map: BaseImageryMap = this.communicator.ActiveMap;

		const center = map.mapObject.getView().getCenter();

		const iconFeature = new Feature({
			geometry: new Point(center),
			name: 'Center'
		});

		iconFeature.setStyle(this._iconStyle);

		const vectorSource = new Vector({
			features: [iconFeature]
		});

		this._existingLayer = new VectorLayer({ source: vectorSource });

		this.communicator.addLayer(this._existingLayer);
	}
}
