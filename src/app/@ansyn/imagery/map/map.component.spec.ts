import { async, ComponentFixture, TestBed } from '@angular/core/testing';
import { MapComponent } from './map.component';
import { Observable, of } from 'rxjs/index';
import { cold } from 'jasmine-marbles';
import { BaseImageryMap } from '../model/base-imagery-map';
import { inject } from '@angular/core/testing';
import { BaseImageryPlugin } from '../model/base-imagery-plugin';

describe('MapComponent', () => {
	let component: MapComponent;
	let fixture: ComponentFixture<MapComponent>;
	let map: BaseImageryMap;

	beforeEach(async(() => {
		TestBed.configureTestingModule({
			declarations: [MapComponent],
			providers: [
				{
					provide: BaseImageryMap,
					useValue: { initMap: of(true) }
				},
				{
					provide: BaseImageryPlugin,
					useValue: []
				}
			]
		})
			.compileComponents();
	}));

	beforeEach(inject([BaseImageryMap], (_map: BaseImageryMap<any>) => {
		fixture = TestBed.createComponent(MapComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
		map = _map;
	}));

	it('should create', () => {
		expect(component).toBeTruthy();
	});

	describe('createMap should raise map via success', () => {
		let success: boolean;

		beforeEach(() => {
			spyOn(map, 'initMap').and.callFake(() => of(success));
		});

		it('on success', () => {
			success = true;
			const expectedResult = cold('(b|)', { b: map });
			expect(component.createMap([])).toBeObservable(expectedResult);

		});

		it('on failed', () => {
			success = false;
			const expectedResult = cold('|');
			expect(component.createMap([])).toBeObservable(expectedResult);
		});

	});
});