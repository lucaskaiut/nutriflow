<?php

namespace App\Modules\Account\Enums;

/** Sexo biológico — usado apenas nas equações de estimativa energética. */
enum Sex: string
{
    case MALE = 'male';
    case FEMALE = 'female';
}
