import {applyAsync} from "../index";

function timeout(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

describe('applyAsync', () => {

    it("runs once per node", async () => {
        const data = {
            person: {
                name: 'Bob'
            }
        }
        let count = 0;
        await applyAsync(data, async () => {
            await timeout(10);
            count++
        })
        expect(count).toEqual(3);
    });

    it("runs accepts multiple callbacks", async () => {
        const data = {
            person: {
                name: 'Bob'
            }
        }
        let count = 0;
        await applyAsync(data,
            async () => {
                await timeout(10);
                count++
            },
            () => count++)
        expect(count).toEqual(6);
    });
})

