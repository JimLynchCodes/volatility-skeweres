import { PartialMaskAccountPipe } from './partial-mask-account.pipe';

describe('PartialMaskAccountPipe', () => {
  it('create an instance', () => {
    const pipe = new PartialMaskAccountPipe();
    expect(pipe).toBeTruthy();
  });
});
