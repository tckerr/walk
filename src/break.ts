export class Break extends Error {
    constructor(message: string = '') {
        super(message);
        this.name = "Break";
    }
}
