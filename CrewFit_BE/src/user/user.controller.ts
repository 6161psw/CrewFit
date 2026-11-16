import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtGuard } from '../auth/guard/jwt.guard';
import { GetUser } from '../common/decorator/get-user.decorator';
import { AuthUser } from '../common/types/auth-user.type';
import { UpdateIntroDto } from './dto/req/update-intro.dto';
import { UpdateMeDto } from './dto/req/update-me.dto';
import { UserService } from './user.service';

@ApiTags('user')
@ApiBearerAuth()
@UseGuards(JwtGuard)
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  /** E-03 내 정보 */
  @Get('me')
  me(@GetUser() user: AuthUser) {
    return this.userService.getMe(user);
  }

  @Patch('me')
  updateMe(@GetUser() user: AuthUser, @Body() dto: UpdateMeDto) {
    return this.userService.updateMe(user, dto);
  }

  /** E-04 자소서 저장 */
  @Patch('me/intro')
  updateIntro(@GetUser() user: AuthUser, @Body() dto: UpdateIntroDto) {
    return this.userService.updateIntro(user, dto);
  }

  /** 관심 공모전 */
  @Get('me/interests')
  interests(@GetUser() user: AuthUser) {
    return this.userService.interests(user);
  }

  /** H-05 / T-07 프로필 상세 (공개 범위 제한) */
  @Get(':id')
  profile(@GetUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.userService.getProfile(user, id);
  }
}
