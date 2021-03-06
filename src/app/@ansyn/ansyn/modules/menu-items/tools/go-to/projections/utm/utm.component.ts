import { Component, EventEmitter, forwardRef, Input, Output } from '@angular/core';
import {
	AbstractControl,
	ControlValueAccessor,
	NG_VALIDATORS,
	NG_VALUE_ACCESSOR,
	ValidationErrors,
	Validator
} from '@angular/forms';
import { isEqual as _isEqual } from 'lodash';
import { IEd50Notification, ProjectionConverterService } from '@ansyn/map-facade';

@Component({
	selector: 'ansyn-utm',
	templateUrl: './utm.component.html',
	styleUrls: ['./utm.component.less'],
	providers: [
		{
			provide: NG_VALUE_ACCESSOR,
			useExisting: forwardRef(() => UtmComponent),
			multi: true
		},
		{
			provide: NG_VALIDATORS,
			useExisting: forwardRef(() => UtmComponent),
			multi: true
		}
	]
})

export class UtmComponent implements ControlValueAccessor, Validator {
	@Output() copyToClipBoardHandler = new EventEmitter();
	@Input() notification: IEd50Notification;
	@Input() title: string;

	coordinates: number[] = [0, 0, 0];
	validationErr: ValidationErrors = null;

	onChanges = (value) => {
	};

	onBlur = () => {
	};

	writeValue(newValue: number[]): void {
		if (newValue && !_isEqual(newValue, this.coordinates)) {
			this.coordinates = newValue.map(num => Math.floor(num));
		}
	}

	registerOnChange(fn: any): void {
		this.onChanges = fn;
	}

	registerOnTouched(fn: any): void {
		this.onBlur = fn;
	}

	onInputs(value) {
		this.onChanges([...value]);
	}

	copyToClipBoard() {
		const [x, y, zone] = this.coordinates;
		this.copyToClipBoardHandler.emit(`${zone}N ${x} ${y}`);
	}

	validate(c: AbstractControl): ValidationErrors {
		if (!c.value) {
			this.validationErr = { empty: true };
			return this.validationErr;
		}
		const someNotNumber = c.value.some(value => typeof value !== 'number');
		if (someNotNumber) {
			this.validationErr = { empty: true };
		} else if (!ProjectionConverterService.isValidUTM(c.value)) {
			this.validationErr = { invalid: true };
		} else {
			this.validationErr = null;
		}
		return this.validationErr;
	}

}
