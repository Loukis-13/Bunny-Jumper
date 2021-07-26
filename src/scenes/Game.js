import Phaser from '../lib/phaser.js'

import Carrot from '../Carrot.js'

export default class Game extends Phaser.Scene
{
    constructor()
    {
        super('game')
    }

    carrotsCollected = 0

    /** @type {Phaser.Types.Input.Keyboard.CursorKeys} */
    cursors

    init()
    {
        this.carrotsCollected = 0
    }

    preload()
    {
        this.load.image('background', 'assets/bg_layer1.png')
        this.load.image('platform', 'assets/ground_grass.png')
        this.load.image('bunny-stand', 'assets/bunny1_stand.png')
        this.load.image('carrot', 'assets/carrot.png')
        this.load.image('bunny-jump', 'assets/bunny1_jump.png')

        this.load.audio('jump', 'assets/sfx/phaseJump1.ogg')

        this.cursors = this.input.keyboard.createCursorKeys()
    }

    create()
    {
        this.add.image(240, 320, 'background').setScrollFactor(0)

        // // add a platform image in the middle
        // this.add.image(240, 320, 'platform').setScale(0.5)

        // // add physics
        // this.physics.add.image(240, 320, 'platform').setScale(0.5)

        // create the group
        this.platforms = this.physics.add.staticGroup()

        for (let i = 0; i < 5; ++i)
        {
            const x = Phaser.Math.Between(80, 400)
            const y = 150 * i

            /** @type {Phaser.Physics.Arcade.Sprite} */
            const platform = this.platforms.create(x, y, 'platform')
            platform.scale = 0.5

            /** @type {Phaser.Physics.Arcade.StaticBody} */
            const body = platform.body
            body.updateFromGameObject()
        }

        this.player = this.physics.add.sprite(240, 320, 'bunny-stand').setScale(0.5)

        this.physics.add.collider(this.platforms, this.player)

        this.player.body.checkCollision.up = false
        this.player.body.checkCollision.left = false
        this.player.body.checkCollision.right = false

        this.cameras.main.startFollow(this.player)

        this.cameras.main.setDeadzone(this.scale.width * 1.5)

        this.carrots = this.physics.add.group({
            classType: Carrot
        })

        this.physics.add.collider(this.platforms, this.carrots)

        this.physics.add.overlap(
            this.player,
            this.carrots,
            this.handleCollectCarrot, // called on overlap
            undefined,
            this
        )

        const style = { color: '#000', fontSize: 24 }
        this.score = this.add.text(240, 10, 'Carrots: 0', style)
            .setScrollFactor(0)
            .setOrigin(0.5, 0)
    }

    update()
    {
        this.platforms.children.iterate(child => {
            /** @type {Phaser.Physics.Arcade.Sprite} */
            const platform = child
            
            const scrollY = this.cameras.main.scrollY
            if (platform.y >= scrollY + 700)
            {
                platform.y = scrollY - Phaser.Math.Between(50, 90)
                platform.body.updateFromGameObject()

                this.addCarrotAbove(platform)
            }
        })

        this.carrots.children.iterate(child => {
            if (child.y >= this.cameras.main.scrollY+700) {
                // hide from display
                this.carrots.killAndHide(child)

                // disable from physics world
                this.physics.world.disableBody(child.body)
            }
        })

        const touchingDown = this.player.body.touching.down

        if (touchingDown)
        {
            // this makes the bunny jump straight up
            this.player.setVelocityY(-300)

            this.player.setTexture('bunny-jump')

            this.sound.play('jump')
        }

        const vy = this.player.body.velocity.y
        if (vy > 0 && this.player.texture.key !== 'bunny-stand')
        {
            // switch back to jump when falling
            this.player.setTexture('bunny-stand')
        }

        // left and right input logic
        if (this.cursors.left.isDown && !touchingDown)
        {
            this.player.setVelocityX(-200)
        }
        else if (this.cursors.right.isDown && !touchingDown)
        {
            this.player.setVelocityX(200)
        }
        else
        {
            // stop movement if not left or right
            this.player.setVelocityX(0)
        }

        this.horizontalWrap(this.player)

        const bottomPlatform = this.findBottomMostPlatform()
        if (this.player.y > bottomPlatform.y + 200)
        {
            this.scene.start('game-over')
        }
    }

    /**
    * @param {Phaser.GameObjects.Sprite} sprite
    */
    horizontalWrap(sprite)
    {
        const halfWidth = sprite.displayWidth * 0.5
        const gameWidth = this.scale.width
        if (sprite.x < -halfWidth)
        {
            sprite.x = gameWidth + halfWidth
        }
        else if (sprite.x > gameWidth + halfWidth)
        {
            sprite.x = -halfWidth
        }
    }

    /**
    * @param {Phaser.GameObjects.Sprite} sprite
    */
    addCarrotAbove(sprite)
    {
        const y = sprite.y - sprite.displayHeight

        /** @type {Phaser.Physics.Arcade.Sprite} */
        const carrot = this.carrots.get(sprite.x, y, 'carrot')

        carrot.body.checkCollision.up = false
        carrot.body.checkCollision.left = false
        carrot.body.checkCollision.right = false

        carrot.setActive(true)
        carrot.setVisible(true)

        this.add.existing(carrot)

        // update the physics body size
        carrot.body.setSize(carrot.width, carrot.height)

        this.physics.world.enable(carrot)

        return carrot
    }

    /**
    * @param {Phaser.Physics.Arcade.Sprite} player
    * @param {Carrot} carrot
    */
    handleCollectCarrot(player, carrot)
    {
        // hide from display
        this.carrots.killAndHide(carrot)

        // disable from physics world
        this.physics.world.disableBody(carrot.body)

        this.carrotsCollected++

        this.score.text = "score: "+ this.carrotsCollected
    }

    findBottomMostPlatform()
    {
        const platforms = this.platforms.getChildren()
        let bottomPlatform = platforms[0]
        for (let i = 1; i < platforms.length; ++i)
        {
            const platform = platforms[i]

            // discard any platforms that are above current
            if (platform.y < bottomPlatform.y)
            {
                continue
            }

            bottomPlatform = platform
        }

        return bottomPlatform
    }
}