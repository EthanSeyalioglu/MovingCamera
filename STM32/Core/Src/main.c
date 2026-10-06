#include "systick.h"
#include "thumbstick.h"
#include "servos_pwm.h"
#include "servo_control.h"
#include "uart.h"
#include <stdint.h>
#include <stdio.h>
#include <stdlib.h>
#include <stdbool.h>\

// test

ServoDirection thumbstick_get_direction(int thumbstick_val_x);
uint16_t update_pulse_width(ServoDirection direction, uint16_t pulse_width);


int main(void)
{
    uint16_t pulse_width_x, pulse_width_y;
    uint16_t thumbstick_values[2];
    ServoDirection direction_x, direction_y;
    uint32_t current_system_tick;
    uint32_t last_servo_update;
    // uint8_t test;

    uart_debug_init();
    printf("UART_Debug Initialized\n\n");

    uart_esp_init();
    printf("UART_ESP Initialized");

    adc_thumbstick_dma_init();
    printf("ADC Initialized\n\n");

    tim2_pwm_init();
    tim3_pwm_init();
    pwm_start();
    printf("PWM Initialized\n\n");

    pulse_width_x = pulse_width_y = SERVO_CENTER;
    servo_x_set_position(pulse_width_x);
    servo_y_set_position(pulse_width_y);

    systick_init_ms(1U);

    last_servo_update = system_get_ticks();

    while (1)
    {

        if (cmd_ready)
        {
            direction_x = servo_cmd.pan;
            direction_y = servo_cmd.tilt;
        }
        else
        {
            adc_thumbstick_read(thumbstick_values);

            direction_x = thumbstick_get_direction(thumbstick_values[0]);
            direction_y = thumbstick_get_direction(thumbstick_values[1]);
        }

        current_system_tick = system_get_ticks();
        if (current_system_tick - last_servo_update >= 2)
        {
            pulse_width_x = update_pulse_width(direction_x, pulse_width_x);
            pulse_width_y = update_pulse_width(direction_y, pulse_width_y);
            
            servo_x_set_position(pulse_width_x);
            servo_y_set_position(pulse_width_y);

            last_servo_update = current_system_tick;
        }

        // if (cmd_ready)
        // {
        //     test++;
        //     printf("ESP32 Message: %s\n", msg_buffer);
        //     cmd_ready = 0;
        // }
        // if (test)
        // {
        //     printf("TEST VAL: %d\n\n", test);
        // }
        // printf("Msg Index: %d\n\n", cmd_index);
        printf("Pulse Width X: %d\n", pulse_width_x);
        printf("Pulse Width Y: %d\n\n", pulse_width_y);
        // printf("Thumbstick X: %d\n", thumbstick_values[0]);
        // printf("Servo Direction: %d\n", direction_x);
        // printf("Thumbstick X: %d\nThumbstick Y: %d\n\n", thumbstick_values[0], thumbstick_values[1]);
    }
}