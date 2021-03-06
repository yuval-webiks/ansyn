import { Inject, Injectable } from '@angular/core';
import {
	geojsonMultiPolygonToPolygons,
	geojsonPolygonToMultiPolygon,
	ImageryCommunicatorService,
	IImageryMapPosition,
	IMapSettings,
	unifyPolygons,
	getPolygonIntersectionRatioWithMultiPolygon
} from '@ansyn/imagery';
import {
	MapActionTypes,
	MapFacadeService,
	mapStateSelector,
	selectMapsList,
	SetToastMessageAction,
	UpdateMapAction,
	SetLayoutSuccessAction, selectActiveMapId, IMapState
} from '@ansyn/map-facade';
import { AnnotationMode, DisabledOpenLayersMapName, OpenlayersMapName } from '@ansyn/ol';
import { Actions, Effect, ofType } from '@ngrx/effects';
import { Action, select, Store } from '@ngrx/store';
import { EMPTY, Observable } from 'rxjs';
import { fromPromise } from 'rxjs/internal-compatibility';
import { catchError, filter, map, mergeMap, switchMap, withLatestFrom, pluck } from 'rxjs/operators';
import {
	BackToWorldFailed,
	BackToWorldSuccess,
	BackToWorldView,
	OverlayStatusActionsTypes, SetAutoImageProcessing, SetAutoImageProcessingSuccess, SetManualImageProcessing,
	SetOverlayScannedAreaDataAction,
	ToggleDraggedModeAction,
	EnableImageProcessing,
	DisableImageProcessing
} from '../actions/overlay-status.actions';
import {
	SetAnnotationMode,
} from '../../../menu-items/tools/actions/tools.actions';
import {
	ICaseMapState,
	IImageManualProcessArgs,
	IOverlaysScannedAreaData
} from '../../../menu-items/cases/models/case.model';
import {
	IOverlayStatusState,
	ITranslationsData, overlayStatusStateSelector,
	selectScannedAreaData,
	selectTranslationData
} from '../reducers/overlay-status.reducer';
import { IOverlay } from '../../models/overlay.model';
import { feature, difference } from '@turf/turf';
import { ImageryVideoMapType } from '@ansyn/imagery-video';
import { IImageProcParam, IOverlayStatusConfig, overlayStatusConfig } from '../config/overlay-status-config';
import { isEqual } from "lodash";
import { CasesActionTypes } from '../../../menu-items/cases/actions/cases.actions';

@Injectable()
export class OverlayStatusEffects {
	@Effect()
	backToWorldView$: Observable<any> = this.actions$
		.pipe(
			ofType(OverlayStatusActionsTypes.BACK_TO_WORLD_VIEW),
			filter( (action: BackToWorldView) => this.communicatorsService.has(action.payload.mapId)),
			switchMap(({payload}: BackToWorldView) => {
				const communicator = this.communicatorsService.provide(payload.mapId);
				const mapData = {...communicator.mapSettings.data};
				const position = mapData.position;
				const disabledMap = communicator.activeMapName === DisabledOpenLayersMapName || communicator.activeMapName === ImageryVideoMapType;
				this.store$.dispatch(new UpdateMapAction({
					id: communicator.id,
					changes: { data: { ...mapData, overlay: null, isAutoImageProcessingActive: false, imageManualProcessArgs: this.defaultImageManualProcessArgs } }
				}));

				return fromPromise<any>(disabledMap ? communicator.setActiveMap(OpenlayersMapName, position) : communicator.loadInitialMapSource(position))
					.pipe(
						map(() => new BackToWorldSuccess(payload)),
						catchError((err) => {
							this.store$.dispatch(new SetToastMessageAction({
								toastText: 'Failed to load map',
								showWarningIcon: true
							}));
							this.store$.dispatch(new BackToWorldFailed({ mapId: payload.mapId, error: err }));
							return EMPTY;
						})
					);
			})
		);

	@Effect()
	onActiveMapChangesSetOverlaysFootprintMode$: Observable<any> = this.store$.select(selectActiveMapId).pipe(
		filter(Boolean),
		withLatestFrom(this.store$.select(mapStateSelector), (activeMapId, mapState: IMapState) => MapFacadeService.activeMap(mapState)),
		filter((activeMap: ICaseMapState) => activeMap && activeMap.data && !activeMap.data.overlay),
		map((activeMap: ICaseMapState) => new DisableImageProcessing())
	);

	@Effect()
	onSelectCase$: Observable<DisableImageProcessing> = this.actions$.pipe(
		ofType(CasesActionTypes.SELECT_CASE),
		map(() => new DisableImageProcessing()));

	@Effect()
	toggleAutoImageProcessing$: Observable<any> = this.actions$.pipe(
		ofType(OverlayStatusActionsTypes.SET_AUTO_IMAGE_PROCESSING),
		withLatestFrom(this.store$.select(mapStateSelector)),
		mergeMap<any, any>(([action, mapsState]: [SetAutoImageProcessing, IMapState]) => {
			mapsState.activeMapId = action.payload.mapId;
			const activeMap: IMapSettings = MapFacadeService.activeMap(mapsState);
			const isAutoImageProcessingActive = !activeMap.data.isAutoImageProcessingActive;
			return [
				new UpdateMapAction({
					id: activeMap.id,
					changes: { data: { ...activeMap.data, isAutoImageProcessingActive } }
				}),
				new SetAutoImageProcessingSuccess(isAutoImageProcessingActive)
			];
		})
	);

	@Effect()
	toggleTranslate$: Observable<any> = this.actions$.pipe(
		ofType(OverlayStatusActionsTypes.TOGGLE_DRAGGED_MODE),
		withLatestFrom(this.store$.select(selectMapsList)),
		mergeMap(([action, maps]: [ToggleDraggedModeAction, IMapSettings[]]) => {
			let annotationMode = null;

			const resultActions = [];
			if (action.payload.dragged) {
				annotationMode = AnnotationMode.Translate;
			}
			const filteredMaps = maps.filter((mapSettings) => mapSettings.id !== action.payload.mapId &&
				Boolean(mapSettings.data.overlay) && mapSettings.data.overlay.id === action.payload.overlayId);
			filteredMaps.forEach((mapSettings) => {
				resultActions.push(new SetAnnotationMode({
					annotationMode: annotationMode,
					mapId: mapSettings.id
				}));
			});
			resultActions.push(new SetAnnotationMode({ annotationMode: annotationMode, mapId: action.payload.mapId }));
			return resultActions;
		})
	);

	@Effect()
	onScannedAreaActivation$: Observable<any> = this.actions$.pipe(
		ofType(OverlayStatusActionsTypes.ACTIVATE_SCANNED_AREA),
		withLatestFrom(this.store$.select(mapStateSelector), this.store$.select(selectScannedAreaData)),
		map(([action, mapState, overlaysScannedAreaData]) => {
			const mapSettings: IMapSettings = MapFacadeService.activeMap(mapState);
			return [mapSettings.data.position, mapSettings.data.overlay, overlaysScannedAreaData];
		}),
		filter(([position, overlay, overlaysScannedAreaData]: [IImageryMapPosition, IOverlay, IOverlaysScannedAreaData]) => Boolean(position) && Boolean(overlay)),
		map(([position, overlay, overlaysScannedAreaData]: [IImageryMapPosition, IOverlay, IOverlaysScannedAreaData]) => {
			let scannedArea = overlaysScannedAreaData && overlaysScannedAreaData[overlay.id];
			if (!scannedArea) {
				scannedArea = geojsonPolygonToMultiPolygon(position.extentPolygon);
			} else {
				try {
					const polygons = geojsonMultiPolygonToPolygons(scannedArea);
					polygons.push(position.extentPolygon);
					const featurePolygons = polygons.map((polygon) => {
						return feature(polygon);
					});
					let combinedResult = unifyPolygons(featurePolygons);
					let scannedAreaContainsExtentPolygon = false;

					scannedArea.coordinates.forEach(coordinates => {
						let multiPolygon = JSON.parse(JSON.stringify(scannedArea));
						multiPolygon.coordinates = [coordinates];

						if (getPolygonIntersectionRatioWithMultiPolygon(position.extentPolygon, multiPolygon)) {
							scannedAreaContainsExtentPolygon = true;
						}
					});

					if (scannedAreaContainsExtentPolygon) {
						combinedResult = difference(combinedResult, position.extentPolygon);
					}

					if (combinedResult === null) {
						scannedArea = null;
					}
					else if (combinedResult.geometry.type === 'MultiPolygon') {
							scannedArea = combinedResult.geometry;
					} else {
						scannedArea = geojsonPolygonToMultiPolygon(combinedResult.geometry);
					}
				} catch (e) {
					console.error('failed to save scanned area', e);
					return EMPTY;
				}
			}
			return new SetOverlayScannedAreaDataAction({ id: overlay.id, area: scannedArea });
		}));

	@Effect()
	onSetLayoutDisableTranslateMode$ = this.actions$.pipe(
		ofType<SetLayoutSuccessAction>(MapActionTypes.SET_LAYOUT_SUCCESS),
		withLatestFrom(this.store$.select(selectTranslationData), this.store$.select(selectActiveMapId)),
		filter(([action, translateData, activeMap]: [SetLayoutSuccessAction, ITranslationsData, string]) => Boolean(translateData && Object.keys(translateData).length)),
		mergeMap(([action, translateData, activeMap]: [SetLayoutSuccessAction, ITranslationsData, string]) => {
			const actions = Object.keys(translateData)
				.filter(id => Boolean(translateData[id].dragged))
				.map(id => new ToggleDraggedModeAction({ mapId: activeMap, overlayId: id, dragged: false }));
			return actions
		})
	);

	activeMap$ = this.store$.pipe(
		select(mapStateSelector),
		map((mapState) => MapFacadeService.activeMap(mapState)),
		filter(Boolean)
	);

	@Effect()
	updateImageProcessing$: Observable<any> = this.activeMap$.pipe(
		withLatestFrom(this.store$.select(overlayStatusStateSelector).pipe(pluck<IOverlayStatusState, IImageManualProcessArgs>('manualImageProcessingParams'))),
		mergeMap<any, any>(([map, manualImageProcessingParams]: [ICaseMapState, IImageManualProcessArgs]) => {
			const { overlay, isAutoImageProcessingActive, imageManualProcessArgs } = map.data;
			const actions: Action[] = [new EnableImageProcessing(), new SetAutoImageProcessingSuccess(overlay ? isAutoImageProcessingActive : false)];
			if (!isEqual(imageManualProcessArgs, manualImageProcessingParams)) {
				actions.push(new SetManualImageProcessing(map.data && imageManualProcessArgs || this.defaultImageManualProcessArgs));
			}
			return actions;
		})
	);

	constructor(protected actions$: Actions,
				protected communicatorsService: ImageryCommunicatorService,
				protected store$: Store<any>,
				@Inject(overlayStatusConfig) protected config: IOverlayStatusConfig) {
	}

	get params(): Array<IImageProcParam> {
		return this.config.ImageProcParams;
	}

	get defaultImageManualProcessArgs(): IImageManualProcessArgs {
		return this.params.reduce<IImageManualProcessArgs>((initialObject: any, imageProcParam) => {
			return <any>{ ...initialObject, [imageProcParam.name]: imageProcParam.defaultValue };
		}, {});
	}
}
