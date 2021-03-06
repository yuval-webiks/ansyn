import { async, ComponentFixture, inject, TestBed } from '@angular/core/testing';
import { ImageryCommunicatorService } from '@ansyn/imagery';
import { mapFeatureKey, MapReducer } from '@ansyn/map-facade';
import { layersFeatureKey, LayersReducer } from '../../layers-manager/reducers/layers.reducer';
import { StartMouseShadow, StopMouseShadow } from '../actions/tools.actions';
import { Store, StoreModule } from '@ngrx/store';
import { ToolsComponent } from './tools.component';
import { SubMenuEnum, toolsFeatureKey, toolsFlags, ToolsReducer } from '../reducers/tools.reducer';
import { MockComponent } from '../../../core/test/mock-component';
import { TranslateModule } from '@ngx-translate/core';
import { MatDialogRef, MatDialog } from '@angular/material/dialog';


describe('ToolsComponent', () => {
	let component: ToolsComponent;
	let fixture: ComponentFixture<ToolsComponent>;
	let store: Store<any>;

	const mockAnnotationsControl = MockComponent({ selector: 'ansyn-annotations-control', inputs: ['expand', 'isGeoOptionsDisabled'] });
	const mockGoTo = MockComponent({
		selector: 'ansyn-go-to',
		inputs: ['expand', 'disabled'],
		outputs: ['onGoTo', 'expandChange']
	});
	const mockOverlaysDisplayMode = MockComponent({
		selector: 'ansyn-overlays-display-mode',
		inputs: ['expand', 'disabled', 'modeOn'],
		outputs: ['expandChange', 'modeOnChange']
	});
	const mockImageManualProcessing = MockComponent({
		selector: 'ansyn-image-processing-control',
		inputs: ['expand', 'initParams'],
		outputs: ['isActive']
	});

	beforeEach(async(() => {
		TestBed.configureTestingModule({
			imports: [StoreModule.forRoot({
				[toolsFeatureKey]: ToolsReducer,
				[layersFeatureKey]: LayersReducer,
				[mapFeatureKey]: MapReducer
			}), TranslateModule.forRoot()],
			declarations: [ToolsComponent, mockGoTo, mockOverlaysDisplayMode, mockAnnotationsControl, mockImageManualProcessing],
			providers: [ImageryCommunicatorService, { provide: MatDialogRef, useValue: {} }, { provide: MatDialog, useValue: {} }]
		})
			.compileComponents();
	}));

	beforeEach(() => {
		fixture = TestBed.createComponent(ToolsComponent);
		// Add manualProcessingControls function: resetAllParams (accessible from ToolsComponent)
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	beforeEach(inject([Store], (_store: Store<any>) => {
		spyOn(_store, 'dispatch');
		store = _store;
	}));

	it('should create', () => {
		expect(component).toBeTruthy();
	});

	it('check the mouse shadow toggle button', () => {
		const button = fixture.debugElement.nativeElement.querySelector('button:first-child');
		component.flags = new Map();
		component.flags.set(toolsFlags.shadowMouse, false);

		// expect(component.flags.get(toolsFlags.shadowMouse)).toBe(false);
		button.click();
		expect(store.dispatch).toHaveBeenCalledWith(new StartMouseShadow({ fromUser: true }));

		component.flags.set(toolsFlags.shadowMouse, true);
		button.click();
		expect(store.dispatch).toHaveBeenCalledWith(new StopMouseShadow({ fromUser: true }));
	});

	it('isExpand should compare between expandedSubMenu to input', () => {
		component.subMenu = SubMenuEnum.annotations;
		expect(component.isExpand(SubMenuEnum.annotations)).toBeTruthy();
		expect(component.isExpand(SubMenuEnum.goTo)).toBeFalsy();
		component.subMenu = null;
	});
});
