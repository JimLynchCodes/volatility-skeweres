import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'pMask'
})
export class PartialMaskAccountPipe implements PipeTransform {

  transform(value: unknown, ...args: unknown[]): unknown {

    if (typeof value === 'string')
      return value.substr(0, 1) + '*****' + value.substr(value.length - 2, 2)

    return value

  }

}
