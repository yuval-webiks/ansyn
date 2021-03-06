import { async, ComponentFixture, TestBed, tick, fakeAsync } from '@angular/core/testing';
import { ExportMapsPopupComponent } from './export-maps-popup.component';
import { ImageryCommunicatorService } from '@ansyn/imagery';
import { MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { StoreModule } from '@ngrx/store';
import { mapFeatureKey, MapReducer } from '@ansyn/map-facade';
import { TranslateModule } from '@ngx-translate/core';
import { LoggerService } from '../../../core/services/logger.service';
import { LoggerConfig } from '../../../core/models/logger.config';
import { toolsConfig } from '../models/tools-config';
import { AnsynFormsModule } from '../../../core/forms/ansyn-forms.module';
import { FormsModule } from '@angular/forms';
import { CoreModule } from '../../../core/core.module';
import { MockComponent } from '../../../../../map-facade/test/mock-component';
import { MatSelectModule } from '@angular/material/select';


describe('ExportMapsPopupComponent', () => {
	let component: ExportMapsPopupComponent;
	let fixture: ComponentFixture<ExportMapsPopupComponent>;

	beforeEach(async(() => {
		TestBed.configureTestingModule({
			declarations: [ExportMapsPopupComponent, MockComponent({
				selector: 'ansyn-animated-ellipsis',
				inputs: ['text', 'rtl'],
				outputs: []
			})],
			imports: [
				CoreModule,
				FormsModule,
				AnsynFormsModule,
				MatDialogModule,
				MatSelectModule,
				StoreModule.forRoot({ [mapFeatureKey]: MapReducer }),
				TranslateModule.forRoot()],
			providers: [ImageryCommunicatorService,
				{
					provide: MatDialogRef, useValue: {
						close: () => {}
					}
				},
				{
					provide: toolsConfig,
					useValue: {
						exportMap: {
							target: 'some-element',
							excludeClasses: []
						}
					}
				},
				LoggerService,
				{
					provide: LoggerConfig,
					useValue: {}
				}
			]
		})
			.compileComponents();
	}));

	beforeEach(() => {
		fixture = TestBed.createComponent(ExportMapsPopupComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});

	it('when pdf selected export should call advancedExportMaps', fakeAsync(() => {
		spyOn(component, 'advancedExportMaps');
		component.selectedExportMethod = component.advancedExport;
		component.format = component.pdfFormat;
		tick();
		component.export();
		expect(component.advancedExportMaps).toHaveBeenCalled();
	}));
});
