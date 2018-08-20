export interface IAnnotationBoundingRect {
	top: number;
	left: number;
	width: number;
	height: number;
}

export interface IAnnotationsSelectionEventData {
	featureId: string;
	mapId: string;
	boundingRect: IAnnotationBoundingRect;
	interactionType?: AnnotationInteraction;
	showMeasures?: boolean;
}

export interface IUpdateFeatureEvent {
	featureId: string;
	properties: { [k: string]: any }
}

export type AnnotationMode = 'Point' | 'LineString' | 'Polygon'| 'Circle' | 'Rectangle' | 'Arrow' | undefined;

export enum AnnotationInteraction {
	click = 'click',
	hover = 'hover'
}
