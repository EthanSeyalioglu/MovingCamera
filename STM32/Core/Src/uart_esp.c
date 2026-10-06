#include "stm32f446xx.h"
#include "uart.h"

#define GPIO_MODER10_AF     (GPIO_MODER_MODER10_1)
#define GPIO_PA10_AF7       (GPIO_AFRH_AFSEL10_0 | GPIO_AFRH_AFSEL10_1 | GPIO_AFRH_AFSEL10_2)

#define CLK_FREQ            16000000
#define BAUDRATE            115200

volatile char msg_buffer[ESP_PCKT_LEN] = {'\0'};
volatile uint8_t cmd_index = 0;
volatile uint8_t cmd_ready = 0;

volatile servo_cmd_pckt_t servo_cmd = {
    .pan = CENTER,
    .tilt = CENTER
};


void uart_esp_init(void)
{
    /*** Set PA10 for USART1 RX ***/
    RCC->AHB1ENR |= RCC_AHB1ENR_GPIOAEN;

    GPIOA->MODER &= ~GPIO_MODER_MODER10;
    GPIOA->MODER |= GPIO_MODER10_AF;

    GPIOA->AFR[1] &= ~GPIO_AFRH_AFSEL10;
    GPIOA->AFR[1] |= GPIO_PA10_AF7;

    RCC->APB2ENR |= RCC_APB2ENR_USART1EN;


    USART1->CR1 |= USART_CR1_UE;
    USART1->CR1 &= ~USART_CR1_M;
    USART1->CR1 |= USART_CR1_RXNEIE;

    USART1->CR2 &= ~USART_CR2_STOP;

    USART1->BRR = calculate_brr(CLK_FREQ, BAUDRATE);

    NVIC_EnableIRQ(USART1_IRQn);

    uart_esp_rx_start();
}


void uart_esp_rx_start(void)
{
    USART1->CR1 |= USART_CR1_RE;
}

void uart_esp_rx_stop(void)
{
    USART1->CR1 &= ~USART_CR1_RE;
}


// void USART1_IRQHandler(void)
// {
//     if (USART1->SR & USART_SR_RXNE)
//     {
//         msg_buffer[cmd_index++] = USART1->DR;

//         if (cmd_index == ESP_MSG_LEN - 1)
//         {
//             msg_buffer[cmd_index] = '\0';
//             cmd_ready = 1;
//             cmd_index = 0;
//         }
//     }
// }


void USART1_IRQHandler(void)
{
    if (USART1->SR & USART_SR_RXNE)
    {
        if (cmd_index == 0)
        {
            servo_cmd.pan = USART1->DR;
        }
        else if (cmd_index == 1)
        {
            servo_cmd.tilt = USART1->DR;
            cmd_index = 0;
        }
    }
}