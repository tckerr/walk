import {AsyncCallbackFn, PartialConfig, walkAsyncStep} from "../index";

function timeout(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

describe('walkAsyncStep', () => {

    it("yields all nodes", async () => {
        const data = {
            person: {
                name: 'Bob'
            }
        }

        let count = 0;
        for await (let walkNode of walkAsyncStep(data, {}))
            count++;

        expect(count).toEqual(3);
    });

    it("runs async callbacks only when iterated", async () => {
        const data = {
            trigger: 1
        }

        let preCount = 0;
        let postCount = 0;
        const config: PartialConfig<AsyncCallbackFn> = {
            callbacks: [
                {
                    positionFilter: "preWalk",
                    filters: n => n.val === 1,
                    callback: async () => {
                        await timeout(30)
                        preCount++
                    }
                },
                {
                    positionFilter: "postWalk",
                    filters: n => n.val === 1,
                    callback: async () => {
                        await timeout(100)
                        postCount++
                    }
                }
            ]
        }

        const generator = walkAsyncStep(data, config);
        await generator.next()
        expect(preCount).toEqual(0);
        expect(postCount).toEqual(0);
        await generator.next()
        expect(preCount).toEqual(1);
        expect(postCount).toEqual(0);
        let res = await generator.next()
        expect(preCount).toEqual(1);
        expect(postCount).toEqual(1);
        expect(res.done).toEqual(true);
    });
})

