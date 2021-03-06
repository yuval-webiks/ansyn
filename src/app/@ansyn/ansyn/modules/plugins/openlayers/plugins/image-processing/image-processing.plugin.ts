import { combineLatest, Observable, of } from 'rxjs';
import ImageLayer from 'ol/layer/Image';
import { BaseImageryPlugin, CommunicatorEntity, ImageryPlugin } from '@ansyn/imagery';
import { Store } from '@ngrx/store';
import { AutoSubscription } from 'auto-subscriptions';
import { IMAGE_PROCESS_ATTRIBUTE, OpenLayersDisabledMap, OpenLayersMap } from '@ansyn/ol';
import { OpenLayersImageProcessing } from './image-processing';
import { distinctUntilChanged, filter, map, take, tap } from 'rxjs/operators';
import { isEqual } from 'lodash';
import { Inject } from '@angular/core';
import { selectMaps } from '@ansyn/map-facade';
import { ICaseMapState, IImageManualProcessArgs } from '../../../../menu-items/cases/models/case.model';
import {
	IImageProcParam,
	IOverlayStatusConfig,
	overlayStatusConfig
} from "../../../../overlays/overlay-status/config/overlay-status-config";

@ImageryPlugin({
	supported: [OpenLayersMap, OpenLayersDisabledMap],
	deps: [Store, overlayStatusConfig]
})
export class ImageProcessingPlugin extends BaseImageryPlugin {
	communicator: CommunicatorEntity;
	private _imageProcessing: OpenLayersImageProcessing;
	private imageLayer: ImageLayer;
	customMainLayer = null;

	currentMap$ = this.store$.select(selectMaps).pipe(
		map((mapsEntities) => mapsEntities[this.mapId]),
		filter(Boolean)
	);

	isAutoImageProcessingActive$ = this.currentMap$.pipe(
		map((currentMap: ICaseMapState) => {
			return currentMap.data.isAutoImageProcessingActive;
		}),
		distinctUntilChanged()
	);

	imageManualProcessArgs$ = this.currentMap$.pipe(
		map((currentMap: ICaseMapState) => {
			return currentMap.data.imageManualProcessArgs;
		}),
		distinctUntilChanged(isEqual)
	);

	@AutoSubscription
	onAutoImageProcessingAndManualImageProcessActive$ = combineLatest([this.isAutoImageProcessingActive$, this.imageManualProcessArgs$]).pipe(
		tap(([isAutoImageProcessingActive, imageManualProcessArgs]: [boolean, IImageManualProcessArgs]) => {
			const isImageProcessActive = this.isImageProcessActive(isAutoImageProcessingActive, imageManualProcessArgs);
			if (!isImageProcessActive) {
				this.removeImageLayer();
				return;
			}

			this.createImageLayer();
			if (Boolean(this.imageLayer)) {
				// auto
				this.setAutoImageProcessing(isAutoImageProcessingActive);
				// manual
				if (!isAutoImageProcessingActive) {
					this._imageProcessing.processImage(imageManualProcessArgs);
				}
			}
		})
	);

	get params(): Array<IImageProcParam> {
		return this.config.ImageProcParams;
	}

	constructor(public store$: Store<any>, @Inject(overlayStatusConfig) protected config: IOverlayStatusConfig) {
		super();
	}

	defaultImageManualProcessArgs(): IImageManualProcessArgs {
		return this.params.reduce<IImageManualProcessArgs>((initialObject: any, imageProcParam: IImageProcParam) => {
			return <any>{ ...initialObject, [imageProcParam.name]: imageProcParam.defaultValue };
		}, {});
	}

	isImageProcessActive(isAutoImageProcessingActive: boolean, imageManualProcessArgs: IImageManualProcessArgs) {
		const defaultManualParams = this.defaultImageManualProcessArgs();
		const result = isAutoImageProcessingActive || (Boolean(imageManualProcessArgs) && !isEqual(defaultManualParams, imageManualProcessArgs));
		return result;
	}

	onResetView(): Observable<boolean> {
		this.setCustomMainLayer(null);
		return of(true).pipe(
			tap(() => this.recalculateManualImageProcessActive())
		);
	}

	recalculateManualImageProcessActive() {
		this._imageProcessing = new OpenLayersImageProcessing();
		this.onAutoImageProcessingAndManualImageProcessActive$.pipe(take(1)).subscribe();
	}

	setCustomMainLayer(layer) {
		if (!isEqual(this.getMainLayer(), layer)) {
			this.removeImageLayer();
		}
		this.customMainLayer = layer;
	}

	getMainLayer(): any {
		return Boolean(this.customMainLayer) ? this.customMainLayer : this.communicator.ActiveMap.getMainLayer();
	}

	public setAutoImageProcessing(shouldPerform: boolean): void {
		if (shouldPerform) {
			// the determine the order which by the image processing will occur
			const processingParams = {
				Histogram: { auto: true },
				Sharpness: { auto: true }
			};
			this._imageProcessing.processImage(processingParams);
		} else {
			this._imageProcessing.processImage(null);
		}
	}

	createImageLayer() {
		if (this.imageLayer) {
			return;
		}
		const mainLayer = this.getMainLayer();
		this.imageLayer = mainLayer.get(IMAGE_PROCESS_ATTRIBUTE);
		if (!this.imageLayer) {
			return;
		}

		this.communicator.ActiveMap.addLayer(this.imageLayer);
		this.imageLayer.setZIndex(0);
		this._imageProcessing = new OpenLayersImageProcessing(<any>this.imageLayer.getSource());
	}

	removeImageLayer(): void {
		if (this.imageLayer) {
			this.communicator.ActiveMap.removeLayer(this.imageLayer);
			this._imageProcessing = new OpenLayersImageProcessing();
			this.imageLayer = null;
		}
	}

}
